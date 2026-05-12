export function validateServiceToken(req: Request, envKey: string): boolean {
  const header = req.headers.get('authorization') ?? ''
  const token = header.replace('Bearer ', '')
  const expected = process.env[envKey]
  return !!expected && token === expected
}
