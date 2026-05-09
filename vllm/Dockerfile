# vllm/Dockerfile
FROM rocm/vllm:latest

# The base image already has vLLM + ROCm installed
# We just need to set the startup command

EXPOSE 8000

CMD ["python", "-m", "vllm.entrypoints.openai.api_server", \
    "--model", "Qwen/Qwen2.5-VL-7B-Instruct", \
    "--dtype", "float16", \
    "--max-model-len", "16384", \
    "--gpu-memory-utilization", "0.88", \
    "--max-num-seqs", "8", \
    "--port", "8000", \
    "--host", "0.0.0.0"]