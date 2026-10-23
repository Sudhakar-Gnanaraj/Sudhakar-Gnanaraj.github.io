# Portfolio chatbot: setup

The "Ask about my work" button on every page (`chat.js`) sends visitors' questions to a small Cloudflare Worker (`worker.js` in this folder). The Worker adds the secret Gemini API key, asks Google's Gemini, and sends the answer back. The key never appears in the website's code.

Until the Worker is set up, the chat shows a polite "email me" message instead of answers.

Both services below are free. Website labels may be worded slightly differently from these steps.

## 1. Get a Gemini API key

1. Go to https://aistudio.google.com and sign in with your Google account.
2. Choose **Get API key**, then **Create API key**.
3. Copy the key and keep it private. Don't paste it into any file in this repository.

Use the free tier: don't add a billing account to the project, so you can never be charged. When the free daily limit runs out, the chat says so and points visitors to your email until the limit resets.

## 2. Create the Cloudflare Worker

1. Sign up at https://dash.cloudflare.com (the free plan is enough).
2. Open **Workers & Pages**, choose **Create**, then **Create Worker**.
3. Name it, for example `portfolio-chat`, and choose **Deploy**.
4. Choose **Edit code**, delete the sample code, paste in the whole of `worker.js` from this folder, and choose **Deploy**.
5. Go to the Worker's **Settings**, then **Variables and Secrets**. Add a variable of type **Secret** named `GEMINI_API_KEY` and paste your key as its value. Save and deploy.
6. Copy the Worker's address. It looks like `https://portfolio-chat.YOUR-NAME.workers.dev`.

## 3. Connect the website

In `chat.js`, put the Worker's address between the quotes:

```js
const CHAT_ENDPOINT = "https://portfolio-chat.YOUR-NAME.workers.dev";
```

Then change `chat.js?v=1` to `chat.js?v=2` in every page so browsers load the new version, and push.

## Updating what the bot knows

Everything the bot knows is the `KNOWLEDGE` text near the top of `worker.js`. When you add a game or change your details, edit that text, then paste the whole file into the Cloudflare editor again and deploy. Don't use backtick characters (`) inside it.

## What the Worker protects against

- Requests from other websites are refused; only `sudhakar-gnanaraj.github.io` (and `localhost:8000` for testing) can use it.
- Each visitor is limited to 6 questions a minute and 60 a day, and messages are cut to 500 characters.
- Visitors in the EU, EEA, Switzerland and the UK get the email message instead, because Google's terms only allow the free tier for apps used outside those regions.

Chats sent through the free tier may be used by Google to improve its products and may be read by human reviewers. The chat panel tells visitors not to share personal details.
