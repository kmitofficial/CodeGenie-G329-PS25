# from transformers import AutoModelForCausalLM, AutoTokenizer
# import torch

# # Use a smaller model for better CPU performance
# model_name = "deepseek-ai/deepseek-coder-1.3b-instruct"  # Correct model name

# print("Loading tokenizer...")
# tokenizer = AutoTokenizer.from_pretrained(model_name)

# print("Loading model (this may take a while)...")
# model = AutoModelForCausalLM.from_pretrained(
#     model_name,
#     device_map="cpu",
#     torch_dtype=torch.float32,  # Lower precision for CPU efficiency
#     low_cpu_mem_usage=True
# )

# print("Model loaded successfully!")

# def generate_code(prompt):
#     input_ids = tokenizer(prompt, return_tensors="pt").input_ids.to("cpu")
#     output = model.generate(input_ids, max_length=150)
#     return tokenizer.decode(output[0], skip_special_tokens=True)

# # Test the model
# prompt = "Write a Python function to check if a number is prime."
# print("\nGenerated Code:\n")
# print(generate_code(prompt))
# from fastapi import FastAPI, HTTPException
# from pydantic import BaseModel
# from transformers import AutoModelForCausalLM, AutoTokenizer
# import torch

# # Initialize FastAPI app
# app = FastAPI()

# # Load the DeepSeek Coder model
# MODEL_NAME = "C:/Users/nisch/.cache/huggingface/hub/models--deepseek-ai--deepseek-coder-1.3b-instruct"

# model = AutoModelForCausalLM.from_pretrained(MODEL_NAME, torch_dtype=torch.float32)

# class PromptRequest(BaseModel):
#     prompt: str

# def generate_code(prompt: str) -> str:
#     """Generate code based on the given prompt."""
#     inputs = tokenizer(prompt, return_tensors="pt")
#     with torch.no_grad():
#         outputs = model.generate(**inputs, max_length=256)
#     return tokenizer.decode(outputs[0], skip_special_tokens=True)

# @app.post("/generate")
# def generate(request: PromptRequest):
#     """API endpoint to generate code from a prompt."""
#     try:
#         response = generate_code(request.prompt)
#         return {"response": response}
#     except Exception as e:
#         raise HTTPException(status_code=500, detail=str(e))

# if __name__ == "__main__":
#     import uvicorn
#     uvicorn.run(app, host="0.0.0.0", port=8000)
# "C:\Users\nisch\.cache\huggingface\hub\models--deepseek-ai--deepseek-coder-1.3b-instruct"
from fastapi import FastAPI
from pydantic import BaseModel
from transformers import AutoModelForCausalLM, AutoTokenizer
import torch
import os
from dotenv import load_dotenv

load_dotenv()  # Load variables from .env file
app = FastAPI()

class RequestModel(BaseModel):
    prompt: str
    max_new_tokens: int = 1024 
MODEL_PATH = os.getenv("MODEL_PATH")
# MODEL_PATH =r"C:\Users\nisch\.cache\huggingface\hub\models--deepseek-ai--deepseek-coder-1.3b-instruct"
device = "cpu"  


print("Loading model from local directory...")
tokenizer = AutoTokenizer.from_pretrained(MODEL_PATH)
model = AutoModelForCausalLM.from_pretrained(
    MODEL_PATH,
    torch_dtype=torch.float16,  
    device_map={"": "cpu"} 
)
print("Model loaded successfully!")


@app.post("/generate")
async def generate_code(request: RequestModel):
    """
    Endpoint to generate code completion based on the input prompt.
    """
    inputs = tokenizer(request.prompt, return_tensors="pt").to(device)

    with torch.no_grad():
        outputs = model.generate(
            **inputs,
            max_new_tokens=request.max_new_tokens,   
            do_sample=False,  
            eos_token_id=tokenizer.eos_token_id  
        )

    completion = tokenizer.decode(outputs[0], skip_special_tokens=True)
    cleaned_output = completion.replace(request.prompt, "").strip()

    return {"completion": cleaned_output}



if __name__ == "__main__":
    import uvicorn
    print("Starting server at http://127.0.0.1:8000")
    uvicorn.run(app, host="0.0.0.0", port=8000)
