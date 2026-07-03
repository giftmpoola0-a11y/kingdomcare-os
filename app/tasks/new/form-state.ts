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
