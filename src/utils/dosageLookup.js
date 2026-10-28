import { api } from '../services/api'
import { lookupQuery, pickLookupMatch } from './batchScan'

// Search online (ai-lookup, Google Search grounded) for details the label scan missed.
// Resolves to { dosage, brand, ingredients, description } from the matching product, or null.
export async function lookupMissingDetails(form, showUsage) {
  const query = lookupQuery(form)
  if (query.length < 2) return null
  const res = await api.cabinet.aiLookup(query)
  if (!res.success || !res.data) return null
  const match = pickLookupMatch(res.data, form.name)
  if (res.aiUsage && showUsage) showUsage(res.aiUsage, 'dosage-lookup', { input: query, output: match?.dosage ?? '' })
  if (!match) return null
  return {
    dosage: String(match.dosage || '').trim(),
    brand: String(match.brand || '').trim(),
    ingredients: String(match.ingredients || '').trim(),
    description: String(match.description || '').trim(),
  }
}
