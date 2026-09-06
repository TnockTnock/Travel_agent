export type TripInput = {
  title: string;
  origin: string;
  destinationCountry: string;
  destination: string;
  startDate: string;
  endDate: string;
};

export function validateTripInput(input: Partial<TripInput>): { ok: true; value: TripInput } | { ok: false; message: string } {
  const fields: Array<[keyof TripInput, string]> = [
    ["title", "Название поездки"],
    ["origin", "Город отправления"],
    ["destinationCountry", "Страна назначения"],
    ["destination", "Город назначения"],
    ["startDate", "Дата начала"],
    ["endDate", "Дата окончания"],
  ];

  for (const [key, label] of fields) {
    if (typeof input[key] !== "string" || !input[key]?.trim()) {
      return { ok: false, message: `Заполните поле «${label}».` };
    }
  }

  const start = new Date(`${input.startDate}T00:00:00Z`);
  const end = new Date(`${input.endDate}T00:00:00Z`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return { ok: false, message: "Укажите корректные даты поездки." };
  }
  if (end < start) {
    return { ok: false, message: "Дата окончания не может быть раньше даты начала." };
  }

  return {
    ok: true,
    value: {
      title: input.title!.trim(),
      origin: input.origin!.trim(),
      destinationCountry: input.destinationCountry!.trim(),
      destination: input.destination!.trim(),
      startDate: input.startDate!,
      endDate: input.endDate!,
    },
  };
}
