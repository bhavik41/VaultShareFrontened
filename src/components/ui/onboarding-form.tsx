import * as React from "react"
import { motion, type Variants } from "framer-motion"
import { Upload, Loader2, AtSign } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

// Omit 'onSubmit' from HTMLAttributes to avoid conflict with our prop
interface OnboardingFormProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "onSubmit"> {
  imageSrc: string
  avatarSrc?: string
  avatarFallback: string
  title: string
  description: string
  inputPlaceholder: string
  buttonText: string
  onUploadClick?: () => void
  onSubmit: (username: string) => void
  isSubmitting?: boolean
  showAvatarUpload?: boolean
}

const FADE_UP: Variants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { type: "spring" as const } },
}

const STAGGER: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.15 } },
}

const OnboardingForm = React.forwardRef<HTMLDivElement, OnboardingFormProps>(
  (
    {
      className,
      imageSrc,
      avatarSrc,
      avatarFallback,
      title,
      description,
      inputPlaceholder,
      buttonText,
      onUploadClick,
      onSubmit,
      isSubmitting = false,
      showAvatarUpload = true,
      ...props
    },
    ref,
  ) => {
    const [username, setUsername] = React.useState("")

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault()
      onSubmit(username)
    }

    return (
      <div
        ref={ref}
        className={cn(
          "w-full max-w-md overflow-hidden rounded-2xl border border-foreground/10 bg-background/60 shadow-lg backdrop-blur-lg",
          className,
        )}
        {...props}
      >
      <motion.div
        initial="hidden"
        animate="show"
        viewport={{ once: true }}
        variants={STAGGER}
      >
        {/* Decorative top image */}
        <motion.div variants={FADE_UP}>
          <img
            src={imageSrc}
            alt="Welcome Banner"
            className="h-48 w-full object-cover"
          />
        </motion.div>

        <div className="space-y-6 p-8 text-center">
          {/* Title and description */}
          <motion.div variants={FADE_UP} className="space-y-2">
            <h1 className="font-bold text-2xl text-foreground">{title}</h1>
            <p className="text-muted-foreground">{description}</p>
          </motion.div>

          {/* Avatar upload section */}
          {showAvatarUpload && (
            <motion.div
              variants={FADE_UP}
              className="flex items-center justify-between rounded-lg border bg-background/50 p-3"
            >
              <div className="flex items-center gap-3">
                <Avatar>
                  <AvatarImage src={avatarSrc} alt="User Avatar" />
                  <AvatarFallback>{avatarFallback}</AvatarFallback>
                </Avatar>
                <div className="text-left">
                  <p className="font-medium text-sm text-foreground">
                    Your avatar
                  </p>
                  <p className="text-xs text-muted-foreground">
                    PNG or JPG up to 10MB
                  </p>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={onUploadClick}>
                <Upload className="mr-2 h-4 w-4" />
                Upload
              </Button>
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <motion.div variants={FADE_UP}>
              <div className="relative">
                <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="username"
                  placeholder={inputPlaceholder}
                  className="pl-9"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
              </div>
            </motion.div>

            <motion.div variants={FADE_UP}>
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {buttonText}
              </Button>
            </motion.div>
          </form>
        </div>
      </motion.div>
      </div>
    )
  },
)
OnboardingForm.displayName = "OnboardingForm"

export { OnboardingForm }
