// Integration: the Users page used web/src's AuthContext; in the shell the signed-in user comes from the shell's
// AuthProvider (same login response, so `user.userId`, `user.role` etc. are unchanged).
export { useAuth } from '../../../../shared/auth/AuthContext'
