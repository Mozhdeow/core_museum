export type ChatMessage={role:'user'|'assistant';text:string;provider?:'mock'|'opencode'|'ollama'|'openai-compatible';model?:string}
/** Memory only; rotating the authenticated owner destroys all prior context histories. */
export function createChatHistory(){
 let owner:string|null=null
 const chats=new Map<string,ChatMessage[]>()
 return {setOwner(next:string|null){if(next!==owner){owner=next;chats.clear()}},read(account:string,key:string){return owner===account?[...(chats.get(key)??[])]:[]},write(account:string,key:string,messages:ChatMessage[]){if(owner===account)chats.set(key,messages.slice(-20))}}
}
