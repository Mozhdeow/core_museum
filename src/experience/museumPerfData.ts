export const perfEnabled=()=>import.meta.env.DEV&&new URLSearchParams(location.search).get('debug')==='perf'
type Sample={at:number;ms:number;hall:string;position:number[]}
export const samples:Sample[]=[],hitches:Sample[]=[]
export const changes:{at:number;tier:string;reason:string;dpr:number}[]=[]
export const perfSnapshot:{current:Record<string,unknown>}={current:{}}
export const museumPerf={dump(){const now=performance.now(),values=samples.filter(s=>now-s.at<5000).map(s=>s.ms).sort((a,b)=>a-b),avg=values.reduce((a,b)=>a+b,0)/(values.length||1),p=(n:number)=>values[Math.min(values.length-1,Math.floor(values.length*n))]??0;return {...perfSnapshot.current,timeOrigin:performance.timeOrigin,fps:1000/(avg||1),avg,p95:p(.95),p99:p(.99),over33:values.filter(v=>v>33).length,over50:values.filter(v=>v>50).length,samples:values.length,hitches:[...hitches],changes:[...changes]}},reset(){samples.length=hitches.length=0},history(){return [...samples]}}
declare global{interface Window{__corePerf?:typeof museumPerf}}
