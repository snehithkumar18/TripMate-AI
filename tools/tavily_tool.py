from tavily import TavilyClient
import os
from dotenv import load_dotenv


def tavily_search(query):
    load_dotenv()
    api_key = os.getenv("TAVILY_API_KEY")

    if not api_key or api_key == "your_tavily_api_key_here":
        return "Tavily API key is missing. Hotel search skipped."

    try:
        client = TavilyClient(api_key=api_key)
        response = client.search(
            query=query,
            max_results=5
        )

        results = []
        for i, r in enumerate(response.get("results", []), 1):
            title   = r.get("title", "Unknown")
            url     = r.get("url", "")
            snippet = r.get("content", "").strip()
            if len(snippet) > 300:
                snippet = snippet[:300].rsplit(" ", 1)[0] + "..."

            results.append(f"{i}. **{title}**\n   {url}\n   {snippet}")

        return "\n\n".join(results) if results else "No hotel search results found."
    except Exception as e:
        print(f"Tavily search error: {e}")
        return f"Hotel search error: {e}"

