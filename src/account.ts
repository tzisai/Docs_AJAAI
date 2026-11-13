import { supabase } from './data'

export async function registerAccount(email: string, password: string, confirmation: string, redirectTo: string) {
  const cleanEmail=email.trim()
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail))throw new Error('Enter a valid email address.')
  if(password.length<8)throw new Error('Use a password with at least 8 characters.')
  if(password!==confirmation)throw new Error('Passwords do not match. Please try again.')
  const {data,error}=await supabase.auth.signUp({email:cleanEmail,password,options:{emailRedirectTo:redirectTo}})
  if(error){
    if(error.code==='signup_disabled'||/signups? (?:are )?not allowed/i.test(error.message))throw new Error('Account creation is currently disabled. Please contact the workspace owner.')
    throw error
  }
  return data.session ? 'signed-in' : 'confirm-email'
}
