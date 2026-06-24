export function validateServiceToken(req: Request, envKey: string): boolean {
  const apiKey = req.headers.get('x-api-key') ?? ''
  const bearer = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '')
  const token  = apiKey || bearer
  const expected = process.env[envKey]
  return !!expected && token === expected
}
