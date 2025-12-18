import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  // Lấy đích đến tiếp theo, mặc định là /dashboard
  const rawNext = searchParams.get('next')
  const nextPath = rawNext && rawNext.startsWith('/') && !rawNext.startsWith('//') ? rawNext : '/dashboard'

  if (code) {
    // Phải có 'await' ở đây vì createClient bây giờ là async
    const supabase = await createClient()
    
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error) {
      const forwardedHost = request.headers.get('x-forwarded-host') // Hỗ trợ deploy Vercel
      const isLocalEnv = process.env.NODE_ENV === 'development'
      
      if (isLocalEnv) {
        return NextResponse.redirect(`${origin}${nextPath}`)
      } else if (forwardedHost) {
        return NextResponse.redirect(`https://${forwardedHost}${nextPath}`)
      } else {
        return NextResponse.redirect(`${origin}${nextPath}`)
      }
    }
  }

  // Nếu lỗi, trả về trang login kèm thông báo
  return NextResponse.redirect(`${origin}/login?error=auth-code-error`)
}