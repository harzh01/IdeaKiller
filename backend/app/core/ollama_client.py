import asyncio
from groq import AsyncGroq, RateLimitError
from app.core.config import settings

client = AsyncGroq(api_key=settings.GROQ_API_KEY)


async def chat(
    system_prompt: str,
    messages: list,
    max_tokens: int = 400,
    retries: int = 3
) -> str:
    full_messages = [
        {"role": "system", "content": system_prompt},
        *messages
    ]
    last_error = None
    for attempt in range(retries):
        try:
            response = await client.chat.completions.create(
                model=settings.GROQ_MODEL,
                messages=full_messages,
                max_tokens=max_tokens,
                temperature=0.8,
            )
            return response.choices[0].message.content.strip()
        except RateLimitError as e:
            last_error = e
            if attempt < retries - 1:
                wait = 2 ** attempt
                print("Rate limited, retrying in " + str(wait) + "s...")
                await asyncio.sleep(wait)
            else:
                raise
        except Exception as e:
            last_error = e
            if attempt < retries - 1:
                await asyncio.sleep(1)
            else:
                raise