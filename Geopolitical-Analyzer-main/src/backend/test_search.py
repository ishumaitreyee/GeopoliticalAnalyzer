print("--- Starting DuckDuckGo Search Test ---")

try:
    from langchain_community.tools import DuckDuckGoSearchResults
    from langchain_community.utilities import DuckDuckGoSearchAPIWrapper
    import traceback

    print("1. Successfully imported LangChain tools.")

    wrapper = DuckDuckGoSearchAPIWrapper(max_results=3)
    print("2. Created the API wrapper.")

    search_tool = DuckDuckGoSearchResults(api_wrapper=wrapper, output_format="list")
    print("3. Instantiated the search tool.")

    query = "What is the geopolitical situation of India and the USA?"
    print(f"4. About to search for: '{query}'")

    results = search_tool.invoke(query)
    print("5. Search invocation complete.")

    print("\n✅ --- TEST SUCCEEDED --- ✅")
    print(f"Found {len(results)} results:")
    for i, res in enumerate(results):
        print(f"  - {res.get('title')}")

except Exception as e:
    print("\n❌ --- TEST FAILED --- ❌")
    print("An error occurred. This confirms the DuckDuckGo library is not working in your environment.")
    print("The full error traceback is below:")
    traceback.print_exc()