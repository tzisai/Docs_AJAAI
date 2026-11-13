import { supabase } from './data'

export async function deleteDocument(documentId: string, ownerId: string) {
  const {data,error}=await supabase.from('documents').delete()
    .eq('id',documentId).eq('owner_id',ownerId).select('id').maybeSingle()
  if(error)throw error
  if(!data)throw new Error('No document was deleted. It may already be gone or you may not be its owner.')
  return data.id as string
}
