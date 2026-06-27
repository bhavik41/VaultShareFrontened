// src/store/filesSlice.ts
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";
import api from "./api";
import { decryptBuffer, loadKey } from "@/utils/crypto";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface UploadedFile {
  id: string;
  userId: string;
  name: string;
  mimeType: string;
  size: number; // bytes
  url: string; // 7-day signed URL stored at upload time
  createdAt: string;
  isEncrypted: boolean;
}

interface FilesState {
  items: UploadedFile[];
  // Per-file upload progress keyed by local (client-side) ID
  uploadProgress: Record<string, number>;
  // Per-file download loading state keyed by server file ID
  downloadingIds: string[];
  loading: boolean;
  error: string | null;
}

// ─── Initial State ────────────────────────────────────────────────────────────

const initialState: FilesState = {
  items: [],
  uploadProgress: {},
  downloadingIds: [],
  loading: false,
  error: null,
};

// ─── Async Thunks ─────────────────────────────────────────────────────────────

/**
 * uploadFileThunk
 * POST /api/files/upload — multipart/form-data with a "file" field.
 * Reports real XHR progress via the `localId` key in uploadProgress.
 */
export const uploadFileThunk = createAsyncThunk<
  UploadedFile,
  { file: File; localId: string; encrypt?: boolean },
  { rejectValue: string }
>("files/upload", async ({ file, localId, encrypt }, { dispatch, rejectWithValue }) => {
  try {
    let uploadFile = file;
    let encKeyBase64url: string | null = null;

    if (encrypt) {
      const { encryptFile } = await import("@/utils/crypto");
      const result = await encryptFile(file);
      uploadFile = result.encryptedFile;
      encKeyBase64url = result.keyBase64url;
    }

    const formData = new FormData();
    formData.append("file", uploadFile);
    if (encrypt) {
      formData.append("encrypted", "true");
      formData.append("originalMimeType", file.type);
    }

    const response = await api.post<{ file: UploadedFile }>(
      "/files/upload",
      formData,
      {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress(event) {
          if (event.total) {
            const percent = Math.round((event.loaded * 100) / event.total);
            dispatch(setProgress({ localId, percent }));
          }
        },
      },
    );

    if (encrypt && encKeyBase64url) {
      const { storeKey } = await import("@/utils/crypto");
      storeKey(response.data.file.id, encKeyBase64url);
    }

    return response.data.file;
  } catch (err: any) {
    return rejectWithValue(
      err.response?.data?.message ?? err.message ?? "Upload failed.",
    );
  }
});

/**
 * listFilesThunk
 * GET /api/files — fetches all files owned by the authenticated user.
 */
export const listFilesThunk = createAsyncThunk<
  UploadedFile[],
  void,
  { rejectValue: string }
>("files/list", async (_, { rejectWithValue }) => {
  try {
    const response = await api.get<{ files: UploadedFile[] }>("/files");
    return response.data.files;
  } catch (err: any) {
    return rejectWithValue(
      err.response?.data?.message ?? "Failed to load files.",
    );
  }
});

/**
 * downloadFileThunk
 * GET /api/files/:id/download
 * The backend streams the actual file bytes from GCS through the server.
 * We receive it as a Blob and trigger the browser's native Save-As dialog.
 */
export const downloadFileThunk = createAsyncThunk<
  void,
  { fileId: string; fileName: string; isEncrypted?: boolean; mimeType?: string },
  { rejectValue: string }
>("files/download", async ({ fileId, fileName, isEncrypted, mimeType }, { rejectWithValue }) => {
  try {
    const response = await api.get(`/files/${fileId}/download`, {
      responseType: "blob",
    });

    let blob: Blob = new Blob([response.data as BlobPart], {
      type: (response.headers["content-type"] as string) ?? "application/octet-stream",
    });

    if (isEncrypted) {
      const keyBase64url = loadKey(fileId);
      if (!keyBase64url) {
        return rejectWithValue("Encryption key not found. Cannot decrypt this file.");
      }
      const encBuffer = await blob.arrayBuffer();
      blob = await decryptBuffer(encBuffer, keyBase64url, mimeType ?? "application/octet-stream");
    }

    const objectUrl = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = objectUrl;
    anchor.download = fileName;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    setTimeout(() => URL.revokeObjectURL(objectUrl), 5000);
  } catch (err: any) {
    return rejectWithValue(err.response?.data?.message ?? err.message ?? "Download failed.");
  }
});

/**
 * getSignedUrlThunk
 * Fetches file bytes from the authenticated preview endpoint and returns a
 * local object URL for in-browser preview.
 */
export const getSignedUrlThunk = createAsyncThunk<
  { id: string; url: string; expiresIn: number },
  string,
  { rejectValue: string }
>("files/signedUrl", async (fileId, { rejectWithValue }) => {
  try {
    const response = await api.get<Blob>(`/files/${fileId}/preview`, {
      responseType: "blob",
    });
    return {
      id: fileId,
      url: URL.createObjectURL(response.data),
      expiresIn: 0,
    };
  } catch (err: any) {
    return rejectWithValue(
      err.response?.data?.message ?? "Failed to get signed URL.",
    );
  }
});

/**
 * deleteFileThunk
 * DELETE /api/files/:id — deletes from GCS and removes from store.
 */
export const deleteFileThunk = createAsyncThunk<
  string, // returns the deleted file id
  string,
  { rejectValue: string }
>("files/delete", async (fileId, { rejectWithValue }) => {
  try {
    await api.delete(`/files/${fileId}`);
    return fileId;
  } catch (err: any) {
    return rejectWithValue(err.response?.data?.message ?? "Delete failed.");
  }
});

// ─── Slice ────────────────────────────────────────────────────────────────────

const filesSlice = createSlice({
  name: "files",
  initialState,
  reducers: {
    setProgress(
      state,
      action: PayloadAction<{ localId: string; percent: number }>,
    ) {
      state.uploadProgress[action.payload.localId] = action.payload.percent;
    },
    clearProgress(state, action: PayloadAction<string>) {
      delete state.uploadProgress[action.payload];
    },
    clearError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // ── upload ─────────────────────────────────────────────────────────────────
    builder
      .addCase(uploadFileThunk.pending, (s) => {
        s.loading = true;
        s.error = null;
      })
      .addCase(uploadFileThunk.fulfilled, (s, a) => {
        s.loading = false;
        s.items.unshift(a.payload); // newest first
        delete s.uploadProgress[a.meta.arg.localId];
      })
      .addCase(uploadFileThunk.rejected, (s, a) => {
        s.loading = false;
        s.error = a.payload ?? "Upload failed.";
      });

    // ── list ───────────────────────────────────────────────────────────────────
    builder
      .addCase(listFilesThunk.pending, (s) => {
        s.loading = true;
        s.error = null;
      })
      .addCase(listFilesThunk.fulfilled, (s, a) => {
        s.loading = false;
        s.items = a.payload ?? [];
      })
      .addCase(listFilesThunk.rejected, (s, a) => {
        s.loading = false;
        s.error = a.payload ?? "Failed to load files.";
      });

    // ── download (stream) ──────────────────────────────────────────────────────
    builder
      .addCase(downloadFileThunk.pending, (s, a) => {
        s.downloadingIds.push(a.meta.arg.fileId);
      })
      .addCase(downloadFileThunk.fulfilled, (s, a) => {
        s.downloadingIds = s.downloadingIds.filter(
          (id) => id !== a.meta.arg.fileId,
        );
      })
      .addCase(downloadFileThunk.rejected, (s, a) => {
        s.downloadingIds = s.downloadingIds.filter(
          (id) => id !== a.meta.arg.fileId,
        );
        s.error = a.payload ?? "Download failed.";
      });

    // ── signed URL ─────────────────────────────────────────────────────────────
    // Update the stored URL for the file so the UI reflects the freshest link
    builder.addCase(getSignedUrlThunk.fulfilled, (s, a) => {
      const idx = s.items.findIndex((f) => f.id === a.payload.id);
      if (idx !== -1) s.items[idx].url = a.payload.url;
    });

    // ── delete ─────────────────────────────────────────────────────────────────
    builder
      .addCase(deleteFileThunk.pending, (s) => {
        s.loading = true;
        s.error = null;
      })
      .addCase(deleteFileThunk.fulfilled, (s, a) => {
        s.loading = false;
        s.items = s.items.filter((f) => f.id !== a.payload);
      })
      .addCase(deleteFileThunk.rejected, (s, a) => {
        s.loading = false;
        s.error = a.payload ?? "Delete failed.";
      });
  },
});

export const { setProgress, clearProgress, clearError } = filesSlice.actions;
export default filesSlice.reducer;
