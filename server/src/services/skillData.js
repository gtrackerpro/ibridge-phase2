const SKILL_SYNONYMS = {
  // Programming Languages
  'javascript': ['js', 'ecmascript', 'es6', 'es2015', 'node.js', 'nodejs', 'typescript', 'ts'],
  'python': ['py', 'python3', 'django', 'flask', 'fastapi'],
  'java': ['jvm', 'spring', 'spring boot', 'hibernate'],
  'c#': ['csharp', 'dotnet', '.net', 'asp.net'],
  'php': ['laravel', 'symfony', 'codeigniter'],
  'ruby': ['rails', 'ruby on rails', 'ror'],
  'go': ['golang'],
  'kotlin': ['android kotlin'],
  'swift': ['ios swift'],

  // Frontend Technologies
  'react': ['reactjs', 'react.js', 'react native', 'jsx'],
  'angular': ['angularjs', 'angular2', 'angular4', 'angular8', 'angular12', 'typescript'],
  'vue': ['vuejs', 'vue.js', 'nuxt', 'nuxt.js'],
  'html': ['html5', 'markup', 'web markup'],
  'css': ['css3', 'scss', 'sass', 'less', 'stylus'],
  'bootstrap': ['bootstrap4', 'bootstrap5', 'responsive design'],
  'tailwind': ['tailwindcss', 'utility-first css'],

  // Backend Technologies
  'node.js': ['nodejs', 'express', 'express.js', 'javascript backend'],
  'spring': ['spring boot', 'spring framework', 'java backend'],
  'django': ['python web', 'python backend'],
  'flask': ['python microframework'],
  'laravel': ['php framework'],
  'rails': ['ruby on rails', 'ror'],

  // Databases
  'database': ['db', 'sql', 'nosql', 'rdbms'],
  'mysql': ['sql', 'relational database', 'rdbms'],
  'postgresql': ['postgres', 'sql', 'relational database'],
  'mongodb': ['mongo', 'nosql', 'document database'],
  'redis': ['cache', 'in-memory database'],
  'elasticsearch': ['elastic', 'search engine'],
  'oracle': ['oracle db', 'sql'],
  'sql server': ['mssql', 'microsoft sql'],

  // Cloud & DevOps
  'aws': ['amazon web services', 'ec2', 's3', 'lambda', 'cloudformation'],
  'azure': ['microsoft azure', 'azure cloud'],
  'gcp': ['google cloud', 'google cloud platform'],
  'docker': ['containerization', 'containers'],
  'kubernetes': ['k8s', 'container orchestration'],
  'jenkins': ['ci/cd', 'continuous integration'],
  'terraform': ['infrastructure as code', 'iac'],
  'ansible': ['configuration management', 'automation'],

  // Development Practices
  'devops': ['deployment', 'ci/cd', 'docker', 'kubernetes', 'automation'],
  'agile': ['scrum', 'kanban', 'sprint planning'],
  'testing': ['qa', 'quality assurance', 'automation testing', 'unit testing'],
  'tdd': ['test driven development', 'unit testing'],
  'microservices': ['service oriented architecture', 'soa', 'distributed systems'],

  // UI/UX
  'frontend': ['front-end', 'ui', 'user interface', 'client-side'],
  'backend': ['back-end', 'server-side', 'api development'],
  'fullstack': ['full-stack', 'full stack developer'],
  'ui/ux': ['user interface', 'user experience', 'design'],
  'responsive design': ['mobile first', 'adaptive design'],

  // Data & Analytics
  'data science': ['machine learning', 'ml', 'data analysis', 'statistics'],
  'machine learning': ['ml', 'ai', 'artificial intelligence', 'deep learning'],
  'data analysis': ['analytics', 'business intelligence', 'bi'],
  'big data': ['hadoop', 'spark', 'data processing'],

  // Mobile Development
  'mobile': ['ios', 'android', 'react native', 'flutter'],
  'ios': ['swift', 'objective-c', 'xcode'],
  'android': ['kotlin', 'java android', 'android studio'],
  'react native': ['cross-platform mobile', 'mobile development'],
  'flutter': ['dart', 'cross-platform mobile'],

  // Project Management
  'project management': ['pm', 'pmp', 'agile', 'scrum master'],
  'business analysis': ['ba', 'requirements gathering', 'stakeholder management'],
  'product management': ['product owner', 'roadmap planning', 'feature prioritization']
};

const SKILL_CATEGORIES = {
  'programming': ['javascript', 'python', 'java', 'c#', 'php', 'ruby', 'go', 'kotlin', 'swift'],
  'frontend': ['react', 'angular', 'vue', 'html', 'css', 'bootstrap', 'tailwind'],
  'backend': ['node.js', 'spring', 'django', 'flask', 'laravel', 'rails'],
  'database': ['mysql', 'postgresql', 'mongodb', 'redis', 'elasticsearch', 'oracle'],
  'cloud': ['aws', 'azure', 'gcp', 'docker', 'kubernetes'],
  'mobile': ['ios', 'android', 'react native', 'flutter'],
  'data': ['data science', 'machine learning', 'data analysis', 'big data']
};

module.exports = {
  SKILL_SYNONYMS,
  SKILL_CATEGORIES
};
