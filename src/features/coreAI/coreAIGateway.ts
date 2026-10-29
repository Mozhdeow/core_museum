import {requireSupabase} from '../../lib/supabase/client'
import {CoreAIError} from './coreAIContracts'
/** Uses only the existing public Supabase configuration and current user session. */
export async function coreAIGateway(){
 const client=requireSupabase(),{data,error}=await client.auth.getSession()
 if(error||!data.session)throw new CoreAIError('authenticationRequired')
 return {url:`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/core-ai`,apikey:(import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY||import.meta.env.VITE_SUPABASE_ANON_KEY) as string,token:data.session.access_token}
}
