// @react-input/mask schedules an internal setTimeout per input change that may
// fire after jsdom teardown in slower CI runners, leaking `ReferenceError: window is not defined`
// into Vitest's unhandled-error stream. Filter only this exact pattern.
process.on('uncaughtException', (error: Error) => {
  const stack = error.stack ?? ''
  if (
    error.message === 'window is not defined' &&
    stack.includes('@react-input')
  ) {
    return
  }
  throw error
})
