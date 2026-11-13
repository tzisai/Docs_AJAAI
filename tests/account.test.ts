import {beforeEach,describe,it,expect,vi} from 'vitest'
vi.mock('../src/data',()=>({supabase:{auth:{signUp:vi.fn()}}}))
import {supabase} from '../src/data'
import {registerAccount} from '../src/account'
const redirect='https://docs.example.test/login?next=%2Fdocs'
beforeEach(()=>vi.clearAllMocks())
describe('New-account registration',()=>{
 it('passes trimmed email and the confirmation return URL to ordinary Supabase Auth',async()=>{
  vi.mocked(supabase.auth.signUp).mockResolvedValue({data:{user:null,session:{access_token:'test-session'}},error:null} as never)
  await expect(registerAccount(' new@example.test ','unique-pass-123','unique-pass-123',redirect)).resolves.toBe('signed-in')
  expect(supabase.auth.signUp).toHaveBeenCalledWith({email:'new@example.test',password:'unique-pass-123',options:{emailRedirectTo:redirect}})
 })
 it('requests email confirmation instead of claiming a signed-in session when none is returned',async()=>{
  vi.mocked(supabase.auth.signUp).mockResolvedValue({data:{user:{id:'new-user'},session:null},error:null} as never)
  await expect(registerAccount('new@example.test','unique-pass-123','unique-pass-123',redirect)).resolves.toBe('confirm-email')
 })
 it.each([
  ['not-an-email','unique-pass-123','unique-pass-123',/valid email/],
  ['new@example.test','short','short',/at least 8/],
  ['new@example.test','unique-pass-123','different-pass',/do not match/],
 ])('rejects invalid input before sending a registration request',async(email,password,confirmation,error)=>{
  await expect(registerAccount(email,password,confirmation,redirect)).rejects.toThrow(error)
  expect(supabase.auth.signUp).not.toHaveBeenCalled()
 })
 it('explains a disabled signup provider without claiming account creation succeeded',async()=>{
  vi.mocked(supabase.auth.signUp).mockResolvedValue({data:{user:null,session:null},error:{code:'signup_disabled',message:'Signups not allowed for this instance'}} as never)
  await expect(registerAccount('new@example.test','unique-pass-123','unique-pass-123',redirect)).rejects.toThrow('Account creation is currently disabled')
 })
 it('preserves other provider errors for a retryable visible failure',async()=>{
  vi.mocked(supabase.auth.signUp).mockResolvedValue({data:{user:null,session:null},error:{code:'over_request_rate_limit',message:'Too many requests. Try again later.'}} as never)
  await expect(registerAccount('new@example.test','unique-pass-123','unique-pass-123',redirect)).rejects.toMatchObject({code:'over_request_rate_limit'})
 })
})
