import authReducer, {
  logout,
  refreshTokenThunk,
  signinThunk,
  validate2faThunk,
  type User,
} from "../../src/store/authSlice";

const user: User = {
  id: "user-1",
  name: "Alice",
  email: "alice@example.com",
  createdAt: "2026-01-01T00:00:00.000Z",
  twoFactorEnabled: false,
};

function signedInState() {
  return authReducer(
    undefined,
    signinThunk.fulfilled(
      { token: "access-token", refreshToken: "refresh-token", user },
      "request-1",
      { email: "alice@example.com", password: "Password123" },
    ),
  );
}

describe("authSlice signin", () => {
  it("stores temp 2FA state without saving full tokens", () => {
    const state = authReducer(
      undefined,
      signinThunk.fulfilled(
        { requires2fa: true, tempToken: "temp-token" },
        "request-1",
        { email: "alice@example.com", password: "Password123" },
      ),
    );

    expect(state.requires2fa).toBe(true);
    expect(state.tempToken).toBe("temp-token");
    expect(state.token).toBeNull();
    expect(state.refreshToken).toBeNull();
    expect(localStorage.getItem("token")).toBeNull();
    expect(localStorage.getItem("refreshToken")).toBeNull();
  });

  it("stores tokens, user, and email after normal signin", () => {
    const state = signedInState();

    expect(state.token).toBe("access-token");
    expect(state.refreshToken).toBe("refresh-token");
    expect(state.user).toEqual(user);
    expect(state.requires2fa).toBe(false);
    expect(localStorage.getItem("token")).toBe("access-token");
    expect(localStorage.getItem("refreshToken")).toBe("refresh-token");
    expect(localStorage.getItem("userEmail")).toBe("alice@example.com");
  });

  it("sets an error and does not save tokens when signin is rejected", () => {
    const state = authReducer(undefined, {
      type: signinThunk.rejected.type,
      payload: "Invalid email or password.",
    });

    expect(state.error).toBe("Invalid email or password.");
    expect(state.token).toBeNull();
    expect(state.refreshToken).toBeNull();
    expect(localStorage.getItem("token")).toBeNull();
  });
});

describe("authSlice 2FA and logout", () => {
  it("clears the 2FA prompt and stores full tokens after validate2fa succeeds", () => {
    const twoFactorState = authReducer(
      undefined,
      signinThunk.fulfilled(
        { requires2fa: true, tempToken: "temp-token" },
        "request-1",
        { email: "alice@example.com", password: "Password123" },
      ),
    );

    const state = authReducer(
      twoFactorState,
      validate2faThunk.fulfilled(
        { token: "validated-access", refreshToken: "validated-refresh", user },
        "request-2",
        { token: "123456" },
      ),
    );

    expect(state.requires2fa).toBe(false);
    expect(state.tempToken).toBeNull();
    expect(state.token).toBe("validated-access");
    expect(state.refreshToken).toBe("validated-refresh");
    expect(state.twoFactorEnabled).toBe(true);
    expect(localStorage.getItem("token")).toBe("validated-access");
    expect(localStorage.getItem("refreshToken")).toBe("validated-refresh");
  });

  it("clears auth state and localStorage on logout", () => {
    localStorage.setItem("token", "access-token");
    localStorage.setItem("refreshToken", "refresh-token");
    localStorage.setItem("userEmail", "alice@example.com");

    const state = authReducer(signedInState(), logout());

    expect(state.user).toBeNull();
    expect(state.token).toBeNull();
    expect(state.refreshToken).toBeNull();
    expect(localStorage.getItem("token")).toBeNull();
    expect(localStorage.getItem("refreshToken")).toBeNull();
    expect(localStorage.getItem("userEmail")).toBeNull();
  });

  it("clears stale session data when refresh is rejected", () => {
    localStorage.setItem("token", "access-token");
    localStorage.setItem("refreshToken", "refresh-token");
    localStorage.setItem("userEmail", "alice@example.com");

    const state = authReducer(signedInState(), {
      type: refreshTokenThunk.rejected.type,
      payload: "Session expired.",
    });

    expect(state.user).toBeNull();
    expect(state.token).toBeNull();
    expect(state.refreshToken).toBeNull();
    expect(localStorage.getItem("token")).toBeNull();
    expect(localStorage.getItem("refreshToken")).toBeNull();
    expect(localStorage.getItem("userEmail")).toBeNull();
  });
});
