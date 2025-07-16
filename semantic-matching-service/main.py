from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Optional, Any
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import os
import logging
from datetime import datetime
import re
import nltk
from nltk.corpus import stopwords
from nltk.tokenize import word_tokenize
from nltk.stem import PorterStemmer

# Global variables for NLTK components
NLTK_AVAILABLE = True
stop_words = set()
stemmer = None

# Download required NLTK data and set up components
def setup_nltk():
    global NLTK_AVAILABLE, stop_words, stemmer
    
    try:
        # Try to download punkt_tab (newer NLTK versions)
        try:
            nltk.data.find('tokenizers/punkt_tab')
        except LookupError:
            nltk.download('punkt_tab', quiet=True)
        
        # Fallback to punkt (older NLTK versions)
        try:
            nltk.data.find('tokenizers/punkt')
        except LookupError:
            nltk.download('punkt', quiet=True)
        
        # Download stopwords
        try:
            nltk.data.find('corpora/stopwords')
        except LookupError:
            nltk.download('stopwords', quiet=True)
        
        # Initialize components
        stop_words = set(stopwords.words('english'))
        stemmer = PorterStemmer()
        NLTK_AVAILABLE = True
        
    except Exception as e:
        print(f"Warning: NLTK setup failed: {e}")
        print("Falling back to basic text processing")
        NLTK_AVAILABLE = False
        # Fallback stopwords
        stop_words = {'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from', 'has', 'he', 'in', 'is', 'it', 'its', 'of', 'on', 'that', 'the', 'to', 'was', 'will', 'with'}
        stemmer = None

# Initialize NLTK
setup_nltk()

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
    title="Semantic Skill Matching API (Lightweight)",
    description="Lightweight semantic skill matching using TF-IDF and cosine similarity",
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

# Initialize text processing components
stemmer = PorterStemmer()
stop_words = set(stopwords.words('english'))

# Skill synonyms for better matching
SKILL_SYNONYMS = {
    'javascript': ['js', 'node', 'nodejs', 'react', 'angular', 'vue'],
    'python': ['django', 'flask', 'fastapi', 'pandas', 'numpy'],
    'java': ['spring', 'springboot', 'maven', 'gradle'],
    'react': ['reactjs', 'jsx', 'redux', 'javascript'],
    'angular': ['angularjs', 'typescript', 'javascript'],
    'vue': ['vuejs', 'nuxt', 'javascript'],
    'html': ['html5', 'css', 'css3', 'bootstrap'],
    'css': ['css3', 'sass', 'scss', 'bootstrap', 'tailwind'],
    'sql': ['mysql', 'postgresql', 'database', 'db'],
    'nosql': ['mongodb', 'redis', 'elasticsearch'],
    'aws': ['amazon', 'ec2', 's3', 'lambda', 'cloud'],
    'docker': ['container', 'kubernetes', 'k8s', 'devops'],
    'git': ['github', 'gitlab', 'version control', 'vcs']
}

def preprocess_text(text):
    """Preprocess text for better matching"""
    # Convert to lowercase
    text = text.lower().strip()
    
    # Remove special characters and numbers
    text = re.sub(r'[^a-zA-Z\s]', '', text)
    
    # Tokenize
    tokens = word_tokenize(text)
    
    # Remove stopwords and stem
    tokens = [stemmer.stem(token) for token in tokens if token not in stop_words]
    
    return ' '.join(tokens)

def expand_skill_with_synonyms(skill):
    """Expand skill with synonyms for better matching"""
    skill_lower = skill.lower().strip()
    expanded = [skill_lower]
    
    for key, synonyms in SKILL_SYNONYMS.items():
        if key in skill_lower or any(syn in skill_lower for syn in synonyms):
            expanded.extend([key] + synonyms)
    
    return ' '.join(set(expanded))

# Global TF-IDF vectorizer (reused for consistency)
vectorizer = TfidfVectorizer(
    max_features=5000,
    stop_words='english',
    ngram_range=(1, 2)
)

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

class MatchAnalysisRequest(BaseModel):
    employeeSkills: List[str]
    employeeExperience: Dict[str, int]
    demandSkills: List[str]
    demandRequirements: Dict[str, Any]

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
    semanticInsights: Optional[Dict[str, Any]] = None

def calculate_similarity(skill1, skill2):
    """Calculate similarity using TF-IDF and cosine similarity"""
    try:
        # Preprocess and expand skills
        expanded_skill1 = expand_skill_with_synonyms(skill1)
        expanded_skill2 = expand_skill_with_synonyms(skill2)
        
        processed_skill1 = preprocess_text(expanded_skill1)
        processed_skill2 = preprocess_text(expanded_skill2)
        
        # Create TF-IDF vectors
        corpus = [processed_skill1, processed_skill2]
        tfidf_matrix = vectorizer.fit_transform(corpus)
        
        # Calculate cosine similarity
        similarity_matrix = cosine_similarity(tfidf_matrix[0:1], tfidf_matrix[1:2])
        similarity = float(similarity_matrix[0][0])
        
        # Boost similarity for exact matches or synonyms
        if skill1.lower().strip() == skill2.lower().strip():
            similarity = 1.0
        elif any(syn in skill2.lower() for syn in SKILL_SYNONYMS.get(skill1.lower(), [])):
            similarity = max(similarity, 0.8)
        
        return similarity
        
    except Exception as e:
        logger.error(f"Error calculating similarity: {str(e)}")
        return 0.0

# API endpoints
@app.get("/")
async def root():
    return {
        "message": "Lightweight Semantic Skill Matching API is running",
        "version": "1.0.0",
        "model": "TF-IDF + Cosine Similarity",
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
        similarity = calculate_similarity(request.skill1, request.skill2)
        
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
    """Create TF-IDF embeddings for multiple skills"""
    try:
        # Process all skills
        processed_skills = []
        for skill in request.skills:
            expanded = expand_skill_with_synonyms(skill)
            processed = preprocess_text(expanded)
            processed_skills.append(processed)
        
        # Create TF-IDF matrix
        tfidf_matrix = vectorizer.fit_transform(processed_skills)
        
        # Convert to dictionary
        embeddings = {}
        for i, skill in enumerate(request.skills):
            embeddings[skill] = tfidf_matrix[i].toarray()[0].tolist()
        
        return {
            "embeddings": embeddings,
            "dimensions": tfidf_matrix.shape[1],
            "model": "TF-IDF"
        }
    except Exception as e:
        logger.error(f"Error in embed_skills: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/find-similar-skills", response_model=SimilarSkillsResponse)
async def find_similar_skills(request: SimilarSkillsRequest):
    """Find skills that are similar to a target skill"""
    try:
        similar_skills = []
        for skill in request.skillList:
            similarity = calculate_similarity(request.targetSkill, skill)
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
    """Perform comprehensive match analysis"""
    try:
        # Simplified analysis using TF-IDF similarity
        primary_demand_skill = request.demandRequirements.get("primarySkill", "")
        min_experience = request.demandRequirements.get("experienceRange", {}).get("min", 0)
        max_experience = request.demandRequirements.get("experienceRange", {}).get("max", 5)
        
        # Find best matching skill
        best_match = {"skill": "", "similarity": 0, "experience": 0}
        for emp_skill in request.employeeSkills:
            similarity = calculate_similarity(emp_skill, primary_demand_skill)
            if similarity > best_match["similarity"]:
                best_match = {
                    "skill": emp_skill,
                    "similarity": similarity,
                    "experience": request.employeeExperience.get(emp_skill, 0)
                }
        
        # Calculate match score
        match_score = 0
        if best_match["similarity"] >= 0.65:
            exp_score = min(100, (best_match["experience"] / max(min_experience, 1)) * 100)
            match_score = int((best_match["similarity"] * 70) + (exp_score * 0.3))
        
        # Determine match type
        if match_score >= 85:
            match_type = "Exact"
        elif match_score >= 70:
            match_type = "Near"
        else:
            match_type = "Not Eligible"
        
        # Find missing skills
        missing_skills = []
        for demand_skill in request.demandSkills:
            has_skill = False
            for emp_skill in request.employeeSkills:
                if calculate_similarity(emp_skill, demand_skill) >= 0.65:
                    has_skill = True
                    break
            if not has_skill:
                missing_skills.append(demand_skill)
        
        # Generate skills matched
        skills_matched = []
        for emp_skill in request.employeeSkills:
            for demand_skill in request.demandSkills:
                similarity = calculate_similarity(emp_skill, demand_skill)
                if similarity >= 0.65:
                    skills_matched.append({
                        "skill": emp_skill,
                        "required": demand_skill == primary_demand_skill,
                        "employeeExperience": request.employeeExperience.get(emp_skill, 0),
                        "requiredExperience": min_experience,
                        "similarity": int(similarity * 100),
                        "matchQuality": "good" if similarity >= 0.8 else "fair"
                    })
        
        return {
            "matchScore": match_score,
            "matchType": match_type,
            "missingSkills": missing_skills,
            "skillsMatched": skills_matched,
            "semanticInsights": {
                "primarySkillSimilarity": best_match["similarity"],
                "skillGapSeverity": "high" if len(missing_skills) > 2 else "medium" if len(missing_skills) > 0 else "none",
                "experienceAlignment": "good" if best_match["experience"] >= min_experience else "needs_improvement"
            }
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
        "model": "TF-IDF + Cosine Similarity",
        "memory_usage": "< 256MB"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
