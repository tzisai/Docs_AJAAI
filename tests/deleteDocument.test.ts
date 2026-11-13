import {beforeEach,describe,it,expect,vi} from 'vitest'
vi.mock('../src/data',()=>({supabase:{from:vi.fn()}}))
import {supabase} from '../src/data'
import {deleteDocument} from '../src/deleteDocument'
const maybeSingle=vi.fn()
const query={delete:vi.fn(),eq:vi.fn(),select:vi.fn(),maybeSingle}
beforeEach(()=>{
 vi.clearAllMocks()
 query.delete.mockReturnValue(query);query.eq.mockReturnValue(query);query.select.mockReturnValue(query)
 vi.mocked(supabase.from).mockReturnValue(query as never)
})
describe('Owner deletion confirmation from the data API',()=>{
 it('confirms a returned row and scopes the request to document and owner',async()=>{
  maybeSingle.mockResolvedValue({data:{id:'doc-1'},error:null})
  await expect(deleteDocument('doc-1','alice')).resolves.toBe('doc-1')
  expect(supabase.from).toHaveBeenCalledWith('documents')
  expect(query.delete).toHaveBeenCalledOnce()
  expect(query.eq).toHaveBeenCalledWith('id','doc-1')
  expect(query.eq).toHaveBeenCalledWith('owner_id','alice')
 })
 it('never treats a zero-row RLS denial as successful deletion',async()=>{
  maybeSingle.mockResolvedValue({data:null,error:null})
  await expect(deleteDocument('doc-1','bob')).rejects.toThrow('No document was deleted')
 })
 it('preserves a permission/network error instead of claiming the card was deleted',async()=>{
  maybeSingle.mockResolvedValue({data:null,error:{code:'42501',message:'permission denied'}})
  await expect(deleteDocument('doc-1','alice')).rejects.toMatchObject({code:'42501'})
 })
})
