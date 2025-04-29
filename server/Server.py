


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
