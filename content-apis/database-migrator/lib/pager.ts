import { Knex } from 'store'

export default function createPager(baseQuery: Knex.QueryBuilder, pageSize: number) {
    let page = 0
    const next = () => {
        return baseQuery
            .clone()
            .offset(page++ * pageSize)
            .limit(pageSize)
    }
    return next
}

type Runner<T> = (pagerResults: T[]) => Knex.QueryBuilder[]
export async function runManagedPager<T>(
    baseQuery: Knex.QueryBuilder,
    pageSize: number,
    pagedQueryRunner: Runner<T>,
) {
    const pager = createPager(baseQuery, pageSize)

    let fetched = 0
    do {
        const results: T[] = await pager().then()
        fetched = results.length
        const queries = pagedQueryRunner(results)
        await Promise.all(queries)
    } while (fetched !== 0)
}
