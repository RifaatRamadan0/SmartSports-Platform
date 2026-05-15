import { Link } from 'react-router-dom'
import { ShieldCheck } from 'lucide-react'
import PageWrapper from '@/components/routing/PageWrapper'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

function PendingApprovalPage() {
  return (
    <PageWrapper className="relative flex min-h-screen items-center justify-center bg-linear-to-br from-[#0f1a12] to-background px-4 py-10">
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 bg-[linear-gradient(var(--border)_1px,transparent_1px),linear-gradient(90deg,var(--border)_1px,transparent_1px)] bg-size-[60px_60px]"
      />

      <div className="relative z-10 w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 flex size-14 items-center justify-center rounded-full border-2 border-primary/30 bg-primary/10">
            <ShieldCheck size={26} className="text-primary" />
          </div>
          <h1 className="text-[1.75rem] font-extrabold tracking-[-0.03em] text-foreground">
            SmartSports
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Book your perfect pitch
          </p>
        </div>

        <Card className="rounded-[1.25rem] border-0 bg-card shadow-[0_0_0_1px_var(--border),0_24px_48px_rgba(0,0,0,0.4)] ring-0">
          <CardHeader className="pb-0">
            <CardTitle className="text-lg font-bold text-foreground">
              Waiting for admin approval
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Your Pitch Owner account is under review.
            </CardDescription>
          </CardHeader>

          <CardContent className="pt-6">
            <p className="text-sm leading-relaxed text-muted-foreground">
              Thanks for signing up. An admin will review your account shortly —
              we'll let you know once you're approved and ready to list pitches.
            </p>

            <div className="mt-6 border-t border-border pt-6 text-center text-sm text-muted-foreground">
              <Link
                to="/login"
                className="font-semibold text-primary hover:underline"
              >
                Back to sign in
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageWrapper>
  )
}

export default PendingApprovalPage
