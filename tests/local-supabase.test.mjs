import assert from 'node:assert/strict'
import {test} from 'node:test'
import {functionsOwnCors} from '../scripts/local-supabase.mjs'

const generated='services:\n  - name: functions-v1\n    url: http://edge:8081/\n    routes:\n      - name: functions-v1-all\n        paths: [/functions/v1/]\n    plugins:\n      - name: cors\n      - name: request-transformer\n  - name: other\n    plugins:\n      - name: cors\n'

test('Functions CORS removal preserves unrelated bytes and is idempotent',()=>{
    const next=functionsOwnCors(generated)
    assert.equal(generated.length-next.length,'      - name: cors\n'.length)
    assert.ok(next.includes('  - name: other\n    plugins:\n      - name: cors'))
    assert.ok(next.includes('      - name: request-transformer'))
    assert.equal(functionsOwnCors(next),next)
})

test('Unexpected customized or global gateway CORS fails closed',()=>{
    assert.throws(()=>functionsOwnCors(generated.replace('      - name: cors\n','      - name: cors\n        config: {origins: [https://example.invalid]}\n')))
    assert.throws(()=>functionsOwnCors('plugins:\n  - name: cors\n'+generated))
})
