export const perfEnabled=()=>import.meta.env.DEV&&new URLSearchParams(location.search).get('debug')==='perf'
export const perfSamples:number[]=[]
export const perfInfo:{current:Record<string,unknown>}={current:{}}
export const assemblyPerf={reset(){perfSamples.length=0},dump(){const n=[...perfSamples].sort((a,b)=>a-b),avg=n.reduce((a,b)=>a+b,0)/(n.length||1);return {...perfInfo.current,avg:perfInfo.current.frameloop==='demand'?null:avg,p95:perfInfo.current.frameloop==='demand'?null:n[Math.floor(n.length*.95)]??0,over33:n.filter(v=>v>33).length,samples:n.length,fps:perfInfo.current.frameloop==='demand'?null:avg?1000/avg:0}}}
declare global{interface Window{__assemblyPerf?:typeof assemblyPerf}}
