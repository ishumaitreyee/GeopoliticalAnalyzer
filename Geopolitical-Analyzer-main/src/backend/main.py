import os
import json
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
import re
import time
from datetime import datetime, timedelta

from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from langchain_community.document_loaders import WebBaseLoader
from langchain_community.tools import DuckDuckGoSearchResults
from langchain_community.utilities import DuckDuckGoSearchAPIWrapper


load_dotenv()

app = FastAPI(
    title="LangChain Geopolitical Analyzer API",
    description="Uses DuckDuckGo Search to find articles and Gemini for analysis.",
    version="12.0.1 (Final)"
)


origins = [
    "https://geopolanalyzer.onrender.com", # Deployed frontend URL
    "http://localhost:3000",              # Local development
    "http://localhost:3001",
    "http://127.0.0.1:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class QueryRequest(BaseModel):
    query: str
    chat_history: list = []  # New field for chat history

class SourceItem(BaseModel):
    title: str
    url: str

class AnalysisResponse(BaseModel):
    answer: str
    sources: list[SourceItem]

def remove_markdown(text):
    """Remove markdown formatting from text"""
    if not text:
        return text

    # Remove headers
    text = re.sub(r'#+\s+', '', text)
    # Remove bold and italic
    text = re.sub(r'\*{1,2}(.*?)\*{1,2}', r'\1', text)
    text = re.sub(r'_{1,2}(.*?)_{1,2}', r'\1', text)
    # Remove code blocks
    text = re.sub(r'`{1,3}(.*?)`{1,3}', r'\1', text)
    # Remove links
    text = re.sub(r'\[(.*?)\]\(.*?\)', r'\1', text)
    # Remove images
    text = re.sub(r'!\[(.*?)\]\(.*?\)', r'\1', text)
    # Remove blockquotes
    text = re.sub(r'^\s*>+\s+', '', text, flags=re.MULTILINE)
    # Remove horizontal rules
    text = re.sub(r'^\s*[-*_]{3,}\s*$', '', text, flags=re.MULTILINE)

    return text.strip()

def get_langchain_analyzer():
    """Initializes and returns a LangChain chain for analysis."""
    api_key = os.getenv("GOOGLE_API_KEY")
    if not api_key:
        raise ValueError("GOOGLE_API_KEY not found in environment variables.")

    prompt_template = ChatPromptTemplate.from_messages([
        ("system", (
            "You are a world-class geopolitical and economic analyst. Your task is to provide a clear, concise, and unbiased "
            "synthesis based ONLY on the provided context from web search results. Do not use external knowledge. "
            "IMPORTANT: Consider the conversation history to maintain context and provide coherent, continuous analysis. "
            "Build upon previous discussions and refer back to earlier topics when relevant. "
            "Focus on providing the most current and up-to-date information available in the provided sources. "
            "If the sources contain recent data, prioritize that information. "
            "Provide your answer in plain text format without any markdown formatting."
        )),
        ("user", "Based on the following context and our conversation history, please answer my question.\n\n"
                 "--- Conversation History ---\n{chat_history}\n\n"
                 "--- Current Web Search Results ---\n{context}\n\n"
                 "--- Current Question ---\n{query}")
    ])


    llm = ChatGoogleGenerativeAI(model="gemini-2.5-flash", temperature=0.3)
    chain = prompt_template | llm | StrOutputParser()
    return chain


try:
    if not os.getenv("GOOGLE_API_KEY"):
        raise ValueError("GOOGLE_API_KEY not found in .env file.")

    analyzer_chain = get_langchain_analyzer()
    wrapper = DuckDuckGoSearchAPIWrapper(max_results=12)
    search_tool = DuckDuckGoSearchResults(api_wrapper=wrapper, output_format="list")

except ValueError as e:
    analyzer_chain = None
    search_tool = None
    print(f"InitializationError: {e}")


def format_chat_history(chat_history):
    """Format chat history for the prompt"""
    if not chat_history:
        return "No previous conversation."

    formatted_history = []
    for i, message in enumerate(chat_history):
        if isinstance(message, dict):
            sender = "User" if message.get("sender") == "user" else "Assistant"
            text = message.get("text", "")
            formatted_history.append(f"{sender}: {text}")
        else:
            formatted_history.append(str(message))

    return "\n".join(formatted_history[-10:])  # Keep last 10 messages to avoid token limits


def enhance_search_query(query, chat_history):
    """Enhance the search query to get more recent and relevant results, considering chat history"""
    enhanced_query = query


    current_year = datetime.now().year

    is_follow_up = len(chat_history) > 0

    # For economic queries like gold prices, add financial context and recency
    economic_terms = ['price', 'gold', 'silver', 'oil', 'stock', 'market', 'currency', 'dollar', 'euro', 'inflation']
    if any(term in query.lower() for term in economic_terms):
        if is_follow_up:
            enhanced_query = f"{query} {current_year} latest update current market news"
        else:
            enhanced_query = f"{query} {current_year} latest today current market news financial update"

    # For political queries, add geopolitical context and recency
    political_terms = ['election', 'government', 'president', 'prime minister', 'war', 'conflict', 'treaty', 'sanctions']
    if any(term in query.lower() for term in political_terms):
        if is_follow_up:
            enhanced_query = f"{query} {current_year} latest developments update"
        else:
            enhanced_query = f"{query} {current_year} latest update current affairs geopolitical analysis"

    # For general queries, add news context and recency
    if enhanced_query == query:
        if is_follow_up:
            enhanced_query = f"{query} {current_year} latest update"
        else:
            enhanced_query = f"{query} {current_year} latest news update today current"

    return enhanced_query


def filter_recent_sources(results, original_query):
    """Filter and prioritize recent sources based on time indicators"""
    relevant_sources = []

    # List of trusted domains for geopolitical and economic analysis
    trusted_domains = [
        'reuters.com', 'bloomberg.com', 'ft.com', 'wsj.com', 'economist.com',
        'foreignpolicy.com', 'foreignaffairs.com', 'carnegieendowment.org',
        'brookings.edu', 'csis.org', 'cfr.org', 'rand.org', 'stratfor.com',
        'aljazeera.com', 'bbc.com', 'cnn.com', 'theguardian.com',
        'apnews.com', 'politico.com', 'axios.com', 'defenseone.com',
        'nationalinterest.org', 'warontherocks.com', 'lawfareblog.com',
        'cnbc.com', 'marketwatch.com', 'investing.com', 'kitco.com',
        'scmp.com','in.investing.com','moneycontrol.com','globaltimes.cn'
    ]

    recent_keywords = [
        'today', 'latest', 'current', 'recent', 'update', 'just', 'new',
        'this week', 'this month', str(datetime.now().year),
        datetime.now().strftime("%B"), 'breaking', 'live'
    ]

    for res in results:
        if not res.get("link") or not res.get("title"):
            continue

        url = res["link"].lower()
        title = res["title"].lower()

        # Skip obviously irrelevant domains
        irrelevant_domains = ['wikipedia.org', 'whatsapp.com', 'facebook.com', 'twitter.com',
                             'youtube.com', 'instagram.com', 'tiktok.com', 'google.com',
                             'apps.microsoft.com', 'play.google.com', 'reddit.com',
                             'quora.com', 'pinterest.com']

        if any(domain in url for domain in irrelevant_domains):
            continue


        is_trusted = any(domain in url for domain in trusted_domains)
        appears_recent = any(keyword in title for keyword in recent_keywords)

        recency_score = 0
        if is_trusted:
            recency_score += 3
        if appears_recent:
            recency_score += 2

        query_terms = original_query.lower().split()
        has_query_terms = any(term in title for term in query_terms if len(term) > 3)

        if has_query_terms:
            recency_score += 1

        if recency_score >= 2:
            relevant_sources.append((res, recency_score))

    relevant_sources.sort(key=lambda x: x[1], reverse=True)

    return [source[0] for source in relevant_sources[:6]]


# --- API Endpoints ---
@app.post("/analyze", response_model=AnalysisResponse)
def analyze_from_web_search(request: QueryRequest):
    if not analyzer_chain or not search_tool:
        raise HTTPException(
            status_code=500,
            detail="API is not initialized. Please check backend .env file and console for errors."
        )

    print(f"Original query: '{request.query}'")
    print(f"Chat history length: {len(request.chat_history)}")


    formatted_history = format_chat_history(request.chat_history)

    enhanced_query = enhance_search_query(request.query, request.chat_history)
    print(f"Enhanced search query: '{enhanced_query}'")

    try:
        results = search_tool.invoke(enhanced_query)
        if not results or not isinstance(results, list):
             raise ValueError("DuckDuckGo search returned an invalid or empty response.")

        print(f"Found {len(results)} initial results")


        filtered_results = filter_recent_sources(results, request.query)
        print(f"After filtering: {len(filtered_results)} recent relevant results")


        sources = []
        urls = []
        for res in filtered_results:
            if res.get("link") and res.get("title"):
                sources.append(SourceItem(title=res["title"], url=res["link"]))
                urls.append(res["link"])
                print(f"  - {res['title']}")

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Search function failed: {e}")

    if not urls:
        print("No relevant recent sources found, trying alternative search...")
        try:
            current_year = datetime.now().year
            alternative_query = f"{request.query} {current_year} latest news today"
            results = search_tool.invoke(alternative_query)
            filtered_results = filter_recent_sources(results, request.query)

            sources = []
            urls = []
            for res in filtered_results:
                if res.get("link") and res.get("title"):
                    sources.append(SourceItem(title=res["title"], url=res["link"]))
                    urls.append(res["link"])

            print(f"Alternative search found {len(urls)} sources")
        except Exception as e:
            raise HTTPException(status_code=404, detail="Could not find recent information for this query. Please try rephrasing or check if this is a current topic.")

    if not urls:
        raise HTTPException(status_code=404, detail="Web search found no recent relevant URLs for the query. Try rephrasing your question to be more specific about current information.")

    print(f"Using {len(urls)} URLs for analysis: {urls}")

    try:
        loader = WebBaseLoader(web_paths=urls, continue_on_failure=True)
        docs = loader.load()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load content from URLs: {e}")

    if not docs:
        raise HTTPException(status_code=500, detail="Web content loader failed to extract any text from the found URLs.")

    combined_context = "\n\n--- Next Article ---\n\n".join(
        [f"Source: {doc.metadata.get('source', 'N/A')}\n\n{doc.page_content}" for doc in docs]
    )

    print("Sending content to Gemini for analysis...")
    try:
        analysis_result = analyzer_chain.invoke({
            "context": combined_context,
            "chat_history": formatted_history,
            "query": request.query
        })

        clean_result = remove_markdown(analysis_result)

        print("Analysis complete.")
        return AnalysisResponse(answer=clean_result, sources=sources)
    except Exception as e:
        print(f"Error during LangChain invocation: {e}")
        raise HTTPException(status_code=500, detail=f"An error occurred during AI analysis: {str(e)}")


@app.get("/")
def read_root():
    return {"status": "ok", "message": "LangChain Geopolitical Analyzer API is running."}