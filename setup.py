try:
    import openai
    import langchain
    import chromadb
    import streamlit
    print("✅ All libraries installed successfully!")
except ImportError as e:
    print(f"❌ Missing: {e}")