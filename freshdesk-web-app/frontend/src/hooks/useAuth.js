import { useSupabase } from '../contexts/SupabaseContext.jsx'

export const useAuth = () => {
  const { user, session, loading, signIn, signUp, signOut } = useSupabase()

  return {
    user,
    session,
    loading,
    isAuthenticated: !!user,
    signIn,
    signUp,
    signOut,
  }
}

export default useAuth 