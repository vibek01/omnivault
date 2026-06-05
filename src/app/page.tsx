import { SessionProvider } from 'next-auth/react'
import DashboardClient from './DashboardClient'
import { auth } from '@/auth'
import { redirect } from 'next/navigation'

export const maxDuration = 60 // Allow 60 seconds for server actions from this page

export default async function Home() {
  const session = await auth()
  if (!session) redirect('/login')

  return (
    <SessionProvider session={session}>
      <DashboardClient />
    </SessionProvider>
  )
}
