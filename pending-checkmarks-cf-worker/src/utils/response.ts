export const respond = (status: number, response: Record<string, unknown>) => {
  console.log('response', status, response)
  return new Response(JSON.stringify(response), {
    status,
  })
}

export const respondError = (status: number, error: string) =>
  respond(status, { error })
