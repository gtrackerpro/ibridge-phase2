from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Optional
import numpy as np
from sentence_transformers import SentenceTransformer
import os
import logging
from datetime import datetime

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler()
    ]
)
logger = logging.getLogger("semantic-matching-service")

# Initialize FastAPI app
app = FastAPI(
    title="Semantic Skill Matching API",
    description="AI-powered semantic skill matching for iBridge-AI platform",
    version="1.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load the sentence transformer model
# Using a smaller model for efficiency, can be replaced with more powerful models
MODEL_NAME = os.getenv("EMBEDDING_MODEL", "all-MiniLM-L6-v2")
model = None

# Model will be loaded on first request to save memory during startup
def get_model():
    global model
    if model is None:
        logger.info(f"Loading model: {MODEL_NAME}")
        model = SentenceTransformer(MODEL_NAME)
    return model

# In-memory cache for embeddings
embedding_cache = {}

# Request/Response models
class SkillMatchRequest(BaseModel):
    skill1: str
    skill2: str

class SkillMatchResponse(BaseModel):
    skill1: str
    skill2: str
    similarity: float
    timestamp: str

class EmbedSkillsRequest(BaseModel):
    skills: List[str]

class EmbedSkillsResponse(BaseModel):
    embeddings: Dict[str, List[float]]
    dimensions: int
    model: str

class SimilarSkillsRequest(BaseModel):
    targetSkill: str
    skillList: List[str]

class SimilarSkill(BaseModel):
    skill: str
    similarity: float

class SimilarSkillsResponse(BaseModel):
    targetSkill: str
    similarSkills: List[SimilarSkill]

class EmployeeSkill(BaseModel):
    skill: str
    experience: int

class MatchAnalysisRequest(BaseModel):
    employeeSkills: List[str]
    employeeExperience: Dict[str, int]
    demandSkills: List[str]
    demandRequirements: Dict[str, any]

class SkillMatch(BaseModel):
    skill: str
    required: bool
    employeeExperience: int
    requiredExperience: int
    similarity: float
    matchQuality: str

class MatchAnalysisResponse(BaseModel):
    matchScore: float
    matchType: str
    missingSkills: List[str]
    skillsMatched: List[SkillMatch]
    semanticInsights: Optional[Dict[str, any]] = None

# Helper functions
def compute_embedding(text):
    """Compute embedding for a text string"""
    if text in embedding_cache:
        return embedding_cache[text]
    
    model = get_model()
    embedding = model.encode(text)
    embedding_cache[text] = embedding
    return embedding

def compute_similarity(vec1, vec2):
    """Compute cosine similarity between two vectors"""
    return float(np.dot(vec1, vec2) / (np.linalg.norm(vec1) * np.linalg.norm(vec2)))

def determine_match_type(score, missing_skills):
    """Determine match type based on score and missing skills"""
    if score >= 85 and len(missing_skills) == 0:
        return "Exact"
    elif score >= 70:
        return "Near"
    elif score >= 50:
        return "Near"
    else:
        return "Not Eligible"

# API endpoints
@app.get("/")
async def root():
    return {
        "message": "Semantic Skill Matching API is running",
        "version": "1.0.0",
        "model": MODEL_NAME,
        "endpoints": [
            "/match-skills",
            "/embed-skills",
            "/find-similar-skills",
            "/analyze-match"
        ]
    }

@app.post("/match-skills", response_model=SkillMatchResponse)
async def match_skills(request: SkillMatchRequest):
    """Calculate semantic similarity between two skills"""
    try:
        # Get embeddings
        embedding1 = compute_embedding(request.skill1)
        embedding2 = compute_embedding(request.skill2)
        
        # Calculate similarity
        similarity = compute_similarity(embedding1, embedding2)
        
        return {
            "skill1": request.skill1,
            "skill2": request.skill2,
            "similarity": similarity,
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"Error in match_skills: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/embed-skills", response_model=EmbedSkillsResponse)
async def embed_skills(request: EmbedSkillsRequest):
    """Embed multiple skills and return their vector representations"""
    try:
        # Get model
        model = get_model()
        
        # Compute embeddings for all skills
        embeddings = {}
        for skill in request.skills:
            embedding = compute_embedding(skill)
            embeddings[skill] = embedding.tolist()
        
        return {
            "embeddings": embeddings,
            "dimensions": len(list(embeddings.values())[0]) if embeddings else 0,
            "model": MODEL_NAME
        }
    except Exception as e:
        logger.error(f"Error in embed_skills: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/find-similar-skills", response_model=SimilarSkillsResponse)
async def find_similar_skills(request: SimilarSkillsRequest):
    """Find skills from a list that are semantically similar to a target skill"""
    try:
        # Get target skill embedding
        target_embedding = compute_embedding(request.targetSkill)
        
        # Compute similarities with all skills in the list
        similar_skills = []
        for skill in request.skillList:
            skill_embedding = compute_embedding(skill)
            similarity = compute_similarity(target_embedding, skill_embedding)
            similar_skills.append({"skill": skill, "similarity": similarity})
        
        # Sort by similarity (descending)
        similar_skills.sort(key=lambda x: x["similarity"], reverse=True)
        
        return {
            "targetSkill": request.targetSkill,
            "similarSkills": similar_skills
        }
    except Exception as e:
        logger.error(f"Error in find_similar_skills: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/analyze-match", response_model=MatchAnalysisResponse)
async def analyze_match(request: MatchAnalysisRequest):
    """Perform comprehensive semantic match analysis between employee skills and demand requirements"""
    try:
        # Get primary demand skill
        primary_demand_skill = request.demandRequirements.get("primarySkill", "")
        min_experience = request.demandRequirements.get("experienceRange", {}).get("min", 0)
        max_experience = request.demandRequirements.get("experienceRange", {}).get("max", 5)
        
        # Calculate match score
        match_score = 0
        weights = {
            "primarySkill": 50,
            "secondarySkills": 25,
            "experience": 15,
            "availability": 10
        }
        
        # Find best matching employee skill for primary demand skill
        best_primary_match = {"skill": "", "similarity": 0, "experience": 0}
        for emp_skill in request.employeeSkills:
            emp_skill_embedding = compute_embedding(emp_skill)
            demand_skill_embedding = compute_embedding(primary_demand_skill)
            similarity = compute_similarity(emp_skill_embedding, demand_skill_embedding)
            
            if similarity > best_primary_match["similarity"]:
                best_primary_match = {
                    "skill": emp_skill,
                    "similarity": similarity,
                    "experience": request.employeeExperience.get(emp_skill, 0)
                }
        
        # Calculate primary skill score
        primary_skill_score = 0
        if best_primary_match["similarity"] >= 0.65:
            emp_exp = best_primary_match["experience"]
            
            if emp_exp >= min_experience and emp_exp <= max_experience:
                # Perfect experience range match
                primary_skill_score = weights["primarySkill"] * best_primary_match["similarity"]
            elif emp_exp > max_experience:
                # Over-qualified - still good but slight penalty
                over_qualification_penalty = min(0.1, (emp_exp - max_experience) / max_experience * 0.1)
                primary_skill_score = weights["primarySkill"] * best_primary_match["similarity"] * (0.95 - over_qualification_penalty)
            elif emp_exp >= min_experience * 0.8:
                # Slightly under-qualified but close
                experience_ratio = emp_exp / min_experience
                primary_skill_score = weights["primarySkill"] * best_primary_match["similarity"] * (0.7 + (experience_ratio * 0.25))
            else:
                # Significantly under-qualified
                experience_ratio = emp_exp / min_experience
                primary_skill_score = weights["primarySkill"] * best_primary_match["similarity"] * max(0.3, experience_ratio * 0.6)
        else:
            # Low similarity to primary skill
            primary_skill_score = weights["primarySkill"] * best_primary_match["similarity"] * 0.5
        
        match_score += primary_skill_score
        
        # Calculate secondary skills match
        secondary_skill_score = 0
        secondary_demand_skills = [s for s in request.demandSkills if s != primary_demand_skill]
        
        if secondary_demand_skills:
            matched_secondary_skills = 0
            total_secondary_skill_score = 0
            
            for demand_skill in secondary_demand_skills:
                best_match = 0
                for emp_skill in request.employeeSkills:
                    emp_skill_embedding = compute_embedding(emp_skill)
                    demand_skill_embedding = compute_embedding(demand_skill)
                    similarity = compute_similarity(emp_skill_embedding, demand_skill_embedding)
                    
                    if similarity >= 0.65:
                        skill_score = min(1, request.employeeExperience.get(emp_skill, 0) / 2)
                        best_match = max(best_match, skill_score * similarity)
                
                if best_match > 0:
                    matched_secondary_skills += 1
                    total_secondary_skill_score += best_match
            
            if matched_secondary_skills > 0:
                match_ratio = matched_secondary_skills / len(secondary_demand_skills)
                avg_skill_score = total_secondary_skill_score / matched_secondary_skills
                secondary_skill_score = weights["secondarySkills"] * match_ratio * avg_skill_score
            else:
                secondary_skill_score = 0
        else:
            # If no secondary skills required, give partial points
            secondary_skill_score = weights["secondarySkills"] * 0.8
        
        match_score += secondary_skill_score
        
        # Experience quality bonus
        experience_score = 0
        if best_primary_match["experience"] >= min_experience and best_primary_match["experience"] <= max_experience:
            # Perfect range
            experience_score = weights["experience"]
        elif best_primary_match["experience"] > max_experience:
            # Over-qualified
            experience_score = weights["experience"] * 0.9
        else:
            # Under-qualified
            ratio = best_primary_match["experience"] / min_experience
            experience_score = weights["experience"] * max(0.2, ratio)
        
        match_score += experience_score
        
        # Availability bonus (not available in this API context, give default)
        match_score += weights["availability"] * 0.8
        
        # Ensure score is between 0-100
        match_score = min(round(match_score), 100)
        
        # Find missing skills
        missing_skills = []
        for demand_skill in request.demandSkills:
            best_match = 0
            for emp_skill in request.employeeSkills:
                emp_skill_embedding = compute_embedding(emp_skill)
                demand_skill_embedding = compute_embedding(demand_skill)
                similarity = compute_similarity(emp_skill_embedding, demand_skill_embedding)
                
                if similarity > best_match:
                    best_match = similarity
            
            if best_match < 0.65:
                missing_skills.append(demand_skill)
        
        # Generate skills matched
        skills_matched = []
        for emp_skill in request.employeeSkills:
            for demand_skill in request.demandSkills:
                emp_skill_embedding = compute_embedding(emp_skill)
                demand_skill_embedding = compute_embedding(demand_skill)
                similarity = compute_similarity(emp_skill_embedding, demand_skill_embedding)
                
                if similarity >= 0.65:
                    is_primary = demand_skill == primary_demand_skill
                    emp_exp = request.employeeExperience.get(emp_skill, 0)
                    req_exp = min_experience if is_primary else 0
                    
                    skills_matched.append({
                        "skill": emp_skill,
                        "required": is_primary,
                        "employeeExperience": emp_exp,
                        "requiredExperience": req_exp,
                        "similarity": round(similarity * 100),
                        "matchQuality": "good" if emp_exp >= req_exp else "needs_improvement"
                    })
        
        # Determine match type
        match_type = determine_match_type(match_score, missing_skills)
        
        # Add semantic insights
        semantic_insights = {
            "primarySkillSimilarity": best_primary_match["similarity"],
            "skillGapSeverity": "high" if len(missing_skills) > 2 else "medium" if len(missing_skills) > 0 else "none",
            "experienceAlignment": "perfect" if best_primary_match["experience"] >= min_experience and best_primary_match["experience"] <= max_experience else "over_qualified" if best_primary_match["experience"] > max_experience else "under_qualified"
        }
        
        return {
            "matchScore": match_score,
            "matchType": match_type,
            "missingSkills": missing_skills,
            "skillsMatched": skills_matched,
            "semanticInsights": semantic_insights
        }
    except Exception as e:
        logger.error(f"Error in analyze_match: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# Health check endpoint
@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "model": MODEL_NAME,
        "embedding_cache_size": len(embedding_cache)
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)