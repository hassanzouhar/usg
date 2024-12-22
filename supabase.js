// Get environment variables and initialize Supabase client
const supabase = window.supabase.createClient(
    getEnvVar('SUPABASE_URL'),
    getEnvVar('SUPABASE_KEY')
);

/**
* Fetch high scores from the database
* @param {number} limit - Number of scores to fetch (default: 10)
* @param {string} orderDirection - Order direction ('asc' or 'desc', default: 'desc')
* @returns {Promise<Array>} Array of high score objects
*/
export const getHighScores = async (limit = 10, orderDirection = 'desc') => {
    try {
        const { data, error } = await supabase
            .from('highscores')
            .select('*')
            .order('score', { ascending: orderDirection === 'asc' })
            .limit(limit)

        if (error) {
            throw error
        }

        return data
    } catch (error) {
        console.error('Error fetching high scores:', error)
        return []
    }
}

/**
* Save a new high score to the database
* @param {string} playerName - Name of the player
* @param {number} score - Player's score
* @returns {Promise<Object|null>} Saved score object or null if error
*/
export const saveHighScore = async (playerName, score) => {
    try {
        const { data, error } = await supabase
            .from('highscores')
            .insert([
                {
                    player_name: playerName,
                    score: score,
                    created_at: new Date().toISOString(),
                }
            ])
            .select()
            .single()

        if (error) {
            throw error
        }

        return data
    } catch (error) {
        console.error('Error saving high score:', error)
        return null
    }
}

/**
* Get a player's best score from the database
* @param {string} playerName - Name of the player
* @returns {Promise<number|null>} Player's best score or null if not found
*/
export const getPlayerBestScore = async (playerName) => {
    try {
        const { data, error } = await supabase
            .from('highscores')
            .select('score')
            .eq('player_name', playerName)
            .order('score', { ascending: false })
            .limit(1)
            .single()

        if (error) {
            throw error
        }

        return data.score
    } catch (error) {
        console.error('Error fetching player best score:', error)
        return null
    }
}

// Export Supabase client instance
export { supabase };
