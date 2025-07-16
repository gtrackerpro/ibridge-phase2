# Semantic Skill Matching Service

This service provides AI-powered semantic skill matching for the iBridge-AI platform, replacing the keyword-based matching with a more intelligent, context-aware system.

## Features

- Semantic similarity calculation between skills
- Skill embedding generation
- Finding similar skills from a list
- Comprehensive match analysis between employee skills and demand requirements

## Technology

- FastAPI for the API framework
- Sentence Transformers for semantic embeddings
- Docker for containerization

## API Endpoints

- `POST /match-skills`: Calculate semantic similarity between two skills
- `POST /embed-skills`: Generate embeddings for multiple skills
- `POST /find-similar-skills`: Find similar skills from a list
- `POST /analyze-match`: Perform comprehensive match analysis
- `GET /health`: Health check endpoint

## Setup and Deployment

### Local Development

1. Install dependencies:
   ```
   pip install -r requirements.txt
   ```

2. Run the service:
   ```
   uvicorn main:app --reload
   ```

3. Access the API documentation at `http://localhost:8000/docs`

### Docker Deployment

1. Build the Docker image:
   ```
   docker build -t semantic-matching-service .
   ```

2. Run the container:
   ```
   docker run -p 8000:8000 semantic-matching-service
   ```

## Environment Variables

- `EMBEDDING_MODEL`: The sentence transformer model to use (default: "all-MiniLM-L6-v2")

## Integration with iBridge-AI

The service is designed to be called from the Node.js backend of iBridge-AI. The integration is handled by the `semanticMatchingService.js` module.

## Example Usage

### Match two skills

```bash
curl -X POST "http://localhost:8000/match-skills" \
     -H "Content-Type: application/json" \
     -d '{"skill1": "JavaScript", "skill2": "TypeScript"}'
```

### Find similar skills

```bash
curl -X POST "http://localhost:8000/find-similar-skills" \
     -H "Content-Type: application/json" \
     -d '{"targetSkill": "React", "skillList": ["Angular", "Vue", "React Native", "JavaScript", "HTML"]}'
```

## Performance Considerations

- The service caches embeddings in memory to improve performance
- The first request may be slower as it loads the model
- For production, consider using a more powerful model or fine-tuning on your specific skill data