export type ProfileInput = { fullName: string };

export function validateProfileInput(input: Partial<ProfileInput>):
  | { ok: true; value: ProfileInput }
  | { ok: false; message: string } {
  if (typeof input.fullName !== "string" || input.fullName.trim().length < 2) {
    return { ok: false, message: "Укажите имя и фамилию минимум из двух символов." };
  }

  return { ok: true, value: { fullName: input.fullName.trim() } };
}
