import { NOTE_FIELDS } from '@/app/data/quickNoteChips'
import type { DemoResident, FormState, GeneratedReport } from '@/app/lib/reportTypes'

export function buildProfessionalSummary(form: FormState): string {
  const parts: string[] = []
  const mealsLow = form.meals.toLowerCase()
  const behaviorLow = form.behavior.toLowerCase().trim()
  const incidentsLow = form.incidents.toLowerCase().trim()

  if (!form.meals.trim()) {
    parts.push('Meal information was not recorded for this shift.')
  } else if (mealsLow.includes('refused meal')) {
    parts.push(
      'The resident refused the meal offered during this shift; this has been documented.'
    )
  } else if (mealsLow.includes('ate 100% of meal')) {
    parts.push('The resident consumed the full meal provided during this shift.')
  } else if (mealsLow.includes('ate about 75% of meal')) {
    parts.push('The resident consumed approximately 75% of the meal provided.')
  } else if (mealsLow.includes('ate about 50% of meal')) {
    parts.push('The resident consumed approximately half of the meal provided.')
  } else if (mealsLow.includes('ate less than 25% of meal')) {
    parts.push(
      'The resident consumed less than a quarter of the meal provided. Poor appetite was noted and documented.'
    )
  } else if (mealsLow.includes('no appetite concerns')) {
    parts.push('No appetite concerns were noted during this shift.')
  } else if (mealsLow.includes('snack given')) {
    parts.push('A snack was provided to the resident during this shift.')
  } else {
    parts.push('Meal notes were recorded for this shift.')
  }

  if (mealsLow.includes('ate with assistance')) {
    parts.push('Eating assistance was provided during the meal.')
  } else if (mealsLow.includes('needed verbal prompting')) {
    parts.push('Verbal prompting was required to support the resident at mealtimes.')
  } else if (mealsLow.includes('ate independently')) {
    parts.push('The resident ate independently without prompting.')
  }

  const drankWater = mealsLow.includes('drank water')
  const drankJuice = mealsLow.includes('drank juice')
  if (drankWater && drankJuice) {
    parts.push('Fluid intake during the shift included water and juice.')
  } else if (drankWater) {
    parts.push('The resident was observed drinking water during the shift.')
  } else if (drankJuice) {
    parts.push('The resident was observed drinking juice during the shift.')
  }

  const noBehaviorTerms = [
    'nothing going on',
    'nothing goin on',
    'no behavioral concerns',
    'n/a',
    'na',
    'none',
    'no concerns',
    'no issues',
    'all good',
    'nothing to note',
    'normal',
    'settled',
    'calm',
  ]
  const noBehaviorConcerns =
    !behaviorLow ||
    noBehaviorTerms.some((term) => behaviorLow === term || behaviorLow.includes(term))

  if (noBehaviorConcerns) {
    parts.push(
      'No behavioural concerns were observed during the shift. The resident remained stable and was supported according to the care plan.'
    )
  } else {
    parts.push(
      'Behavioural observations were noted during the shift and are documented in detail below.'
    )
  }

  const noIncidentTerms = ['no incidents', 'none', 'n/a', 'na', 'nil', 'nothing']
  const noIncidents =
    !incidentsLow ||
    noIncidentTerms.some((term) => incidentsLow === term || incidentsLow.includes(term))

  if (noIncidents) {
    parts.push('No incidents were reported during this shift.')
  } else {
    parts.push(
      'An incident was recorded during this shift and is detailed in the notes below.'
    )
  }

  return parts.join(' ')
}

export function buildReport(
  form: FormState,
  residents: DemoResident[]
): GeneratedReport | null {
  const resident = residents.find((entry) => entry.id === form.residentId)
  if (!resident || !form.shiftType) return null

  return {
    residentName: resident.name,
    shiftType: form.shiftType,
    date: new Date().toLocaleDateString('en-GB', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }),
    professionalSummary: buildProfessionalSummary(form),
    fields: NOTE_FIELDS.map(({ id, label }) => ({
      label,
      value:
        form[id].trim() ||
        (id === 'incidents' ? 'None reported.' : 'No information recorded.'),
    })),
  }
}
