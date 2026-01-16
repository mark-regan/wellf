-- Cooking Module Database Schema
-- Migration for recipes, collections, meal planning, and shopping lists

-- Recipes table
CREATE TABLE IF NOT EXISTS recipes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Basic info
    title VARCHAR(255) NOT NULL,
    description TEXT,
    source_url VARCHAR(500),
    source_name VARCHAR(100), -- "BBC Good Food", "Waitrose", "Manual", etc.
    image_url VARCHAR(500),

    -- Timing
    prep_time_minutes INT,
    cook_time_minutes INT,
    total_time_minutes INT,

    -- Servings
    servings INT,
    servings_unit VARCHAR(50) DEFAULT 'servings',

    -- Content
    ingredients JSONB NOT NULL DEFAULT '[]', -- [{amount, unit, name, group, notes}]
    instructions JSONB NOT NULL DEFAULT '[]', -- [{step, text, image_url}]

    -- Categorisation
    cuisine VARCHAR(50),
    course VARCHAR(50), -- starter, main, dessert, side, snack, drink
    diet_tags TEXT[], -- vegetarian, vegan, gluten-free, dairy-free, etc.
    custom_tags TEXT[],

    -- User data
    rating INT CHECK (rating >= 1 AND rating <= 5),
    notes TEXT,
    is_favourite BOOLEAN DEFAULT false,
    times_cooked INT DEFAULT 0,
    last_cooked_at DATE,

    -- Nutrition (if available from scraping)
    nutrition JSONB DEFAULT '{}', -- {calories, protein, carbs, fat, etc.}

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Recipe collections (folders/categories)
CREATE TABLE IF NOT EXISTS recipe_collections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    cover_image_url VARCHAR(500),
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Many-to-many relationship between recipes and collections
CREATE TABLE IF NOT EXISTS recipe_collection_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    collection_id UUID NOT NULL REFERENCES recipe_collections(id) ON DELETE CASCADE,
    recipe_id UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
    sort_order INT DEFAULT 0,
    added_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(collection_id, recipe_id)
);

-- Meal planning calendar
CREATE TABLE IF NOT EXISTS meal_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    plan_date DATE NOT NULL,
    meal_type VARCHAR(20) NOT NULL, -- breakfast, lunch, dinner, snack
    recipe_id UUID REFERENCES recipes(id) ON DELETE SET NULL,
    custom_meal VARCHAR(255), -- If not using saved recipe
    servings INT DEFAULT 1,
    notes TEXT,
    is_cooked BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, plan_date, meal_type)
);

-- Shopping list items
CREATE TABLE IF NOT EXISTS shopping_list_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    ingredient_name VARCHAR(255) NOT NULL,
    amount VARCHAR(50),
    unit VARCHAR(50),
    category VARCHAR(50), -- produce, dairy, meat, bakery, frozen, pantry, other
    recipe_id UUID REFERENCES recipes(id) ON DELETE SET NULL,
    meal_plan_id UUID REFERENCES meal_plans(id) ON DELETE SET NULL,
    is_checked BOOLEAN DEFAULT false,
    sort_order INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_recipes_user ON recipes(user_id);
CREATE INDEX IF NOT EXISTS idx_recipes_favourite ON recipes(user_id, is_favourite) WHERE is_favourite = true;
CREATE INDEX IF NOT EXISTS idx_recipes_tags ON recipes USING GIN (diet_tags);
CREATE INDEX IF NOT EXISTS idx_recipes_custom_tags ON recipes USING GIN (custom_tags);
CREATE INDEX IF NOT EXISTS idx_recipe_collections_user ON recipe_collections(user_id);
CREATE INDEX IF NOT EXISTS idx_recipe_collection_items_collection ON recipe_collection_items(collection_id);
CREATE INDEX IF NOT EXISTS idx_recipe_collection_items_recipe ON recipe_collection_items(recipe_id);
CREATE INDEX IF NOT EXISTS idx_meal_plans_user_date ON meal_plans(user_id, plan_date);
CREATE INDEX IF NOT EXISTS idx_shopping_list_user ON shopping_list_items(user_id, is_checked);
