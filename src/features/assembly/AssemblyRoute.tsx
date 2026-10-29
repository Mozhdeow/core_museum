import {lazy, Suspense} from 'react'
import {AssemblyLoading} from './AssemblyLoading'

const Lab = lazy(() => import('./AssemblyLab'))

export function AssemblyRoute() {
    return <Suspense fallback={<AssemblyLoading/>}>
        <Lab/>
    </Suspense>
}
