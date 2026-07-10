// Radix Select items can't use an empty string as a value, so the "no
// resident selected" option uses this sentinel and is normalized back to
// null when the form is submitted.
export const GENERAL_TASK_RESIDENT_VALUE = '__general__'

export interface TaskCreateFormState {
  error: string | null
  fieldErrors: {
    title?: string
    category?: string
    priority?: string
    dueAt?: string
    residentId?: string
  }
}

export const INITIAL_TASK_CREATE_STATE: TaskCreateFormState = {
  error: null,
  fieldErrors: {},
}
