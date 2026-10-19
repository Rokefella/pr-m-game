export type FeedbackPayload = { message: string; route: string; user_agent: string };

export async function sendBetaFeedback(
  message: string,
  route: string,
  userAgent: string,
  insert: (payload: FeedbackPayload) => PromiseLike<{ error: { message: string } | null }>,
): Promise<void> {
  const trimmed = message.trim();
  if (!trimmed) throw new Error('Write a message first.');
  const { error } = await insert({ message: trimmed, route, user_agent: userAgent });
  if (error) throw new Error(error.message);
}