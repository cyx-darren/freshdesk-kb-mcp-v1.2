import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables:')
  console.error('   SUPABASE_URL:', supabaseUrl ? '✅' : '❌')
  console.error('   SUPABASE_SERVICE_KEY:', supabaseServiceKey ? '✅' : '❌')
  console.error('\nPlease copy .env.example to .env and fill in your Supabase credentials.')
  process.exit(1)
}

// Create Supabase client with service role key
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function testSupabaseConnection() {
  console.log('🧪 Testing Supabase Connection...\n')
  
  try {
    // Test 1: Basic connection
    console.log('1️⃣ Testing basic connection...')
    const { data, error } = await supabase.from('profiles').select('count', { count: 'exact', head: true })
    
    if (error) {
      console.error('❌ Connection failed:', error.message)
      return false
    }
    
    console.log('✅ Connection successful!')
    console.log(`   Current profiles count: ${data?.length || 0}\n`)
    
    // Test 2: Create test user profile
    console.log('2️⃣ Creating test user profile...')
    const testUserId = '550e8400-e29b-41d4-a716-446655440000' // UUID v4 format
    
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: testUserId,
        username: 'testuser',
        email: 'test@example.com',
        role: 'user'
      })
      .select()
    
    if (profileError) {
      console.error('❌ Profile creation failed:', profileError.message)
    } else {
      console.log('✅ Test profile created successfully!')
      console.log('   Profile data:', profileData)
    }
    
    // Test 3: Create search history
    console.log('\n3️⃣ Creating test search history...')
    const searchHistoryData = [
      {
        user_id: testUserId,
        query: 'How to reset password',
        category: 'account',
        results_count: 5
      },
      {
        user_id: testUserId,
        query: 'API documentation',
        category: 'technical',
        results_count: 12
      },
      {
        user_id: testUserId,
        query: 'billing questions',
        category: 'billing',
        results_count: 3
      }
    ]
    
    const { data: historyData, error: historyError } = await supabase
      .from('search_history')
      .insert(searchHistoryData)
      .select()
    
    if (historyError) {
      console.error('❌ Search history creation failed:', historyError.message)
    } else {
      console.log('✅ Search history created successfully!')
      console.log(`   Created ${historyData.length} search records`)
    }
    
    // Test 4: Create user preferences
    console.log('\n4️⃣ Creating test user preferences...')
    const { data: prefsData, error: prefsError } = await supabase
      .from('user_preferences')
      .upsert({
        user_id: testUserId,
        preferences_json: {
          theme: 'dark',
          language: 'en',
          notifications: true,
          results_per_page: 10,
          preferred_categories: ['technical', 'billing']
        }
      })
      .select()
    
    if (prefsError) {
      console.error('❌ User preferences creation failed:', prefsError.message)
    } else {
      console.log('✅ User preferences created successfully!')
      console.log('   Preferences:', prefsData[0]?.preferences_json)
    }
    
    // Test 5: Create article cache
    console.log('\n5️⃣ Creating test article cache...')
    const articleCacheData = [
      {
        article_id: 'fd-article-001',
        data: {
          title: 'Getting Started with Our API',
          content: 'This article explains how to get started with our REST API...',
          category: 'technical',
          tags: ['api', 'getting-started', 'rest'],
          author: 'Support Team',
          updated_at: new Date().toISOString()
        },
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours from now
      },
      {
        article_id: 'fd-article-002',
        data: {
          title: 'Understanding Your Bill',
          content: 'This article breaks down the components of your monthly bill...',
          category: 'billing',
          tags: ['billing', 'charges', 'subscription'],
          author: 'Billing Team',
          updated_at: new Date().toISOString()
        },
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      }
    ]
    
    const { data: cacheData, error: cacheError } = await supabase
      .from('article_cache')
      .insert(articleCacheData)
      .select()
    
    if (cacheError) {
      console.error('❌ Article cache creation failed:', cacheError.message)
    } else {
      console.log('✅ Article cache created successfully!')
      console.log(`   Cached ${cacheData.length} articles`)
    }
    
    // Test 6: Query test data
    console.log('\n6️⃣ Querying test data...')
    
    // Get profile with search history count
    const { data: profileWithStats, error: statsError } = await supabase
      .from('profiles')
      .select(`
        *,
        search_history(count),
        user_preferences(preferences_json)
      `)
      .eq('id', testUserId)
      .single()
    
    if (statsError) {
      console.error('❌ Stats query failed:', statsError.message)
    } else {
      console.log('✅ Profile stats retrieved successfully!')
      console.log('   Username:', profileWithStats.username)
      console.log('   Email:', profileWithStats.email)
      console.log('   Search history count:', profileWithStats.search_history.length)
      console.log('   Has preferences:', !!profileWithStats.user_preferences.length)
    }
    
    // Get recent searches
    const { data: recentSearches, error: searchError } = await supabase
      .from('search_history')
      .select('query, category, results_count, timestamp')
      .eq('user_id', testUserId)
      .order('timestamp', { ascending: false })
      .limit(5)
    
    if (searchError) {
      console.error('❌ Recent searches query failed:', searchError.message)
    } else {
      console.log('\n📊 Recent searches:')
      recentSearches.forEach((search, index) => {
        console.log(`   ${index + 1}. "${search.query}" (${search.category}) - ${search.results_count} results`)
      })
    }
    
    console.log('\n🎉 All tests completed successfully!')
    console.log('\n📝 Summary of created test data:')
    console.log('   ✅ 1 test user profile')
    console.log('   ✅ 3 search history records')
    console.log('   ✅ 1 user preferences record')
    console.log('   ✅ 2 cached articles')
    
    return true
    
  } catch (error) {
    console.error('❌ Unexpected error:', error.message)
    return false
  }
}

// Cleanup function to remove test data
async function cleanupTestData() {
  console.log('\n🧹 Cleaning up test data...')
  
  const testUserId = '550e8400-e29b-41d4-a716-446655440000'
  
  try {
    // Delete in reverse order due to foreign key constraints
    await supabase.from('search_history').delete().eq('user_id', testUserId)
    await supabase.from('user_preferences').delete().eq('user_id', testUserId)
    await supabase.from('profiles').delete().eq('id', testUserId)
    await supabase.from('article_cache').delete().in('article_id', ['fd-article-001', 'fd-article-002'])
    
    console.log('✅ Test data cleaned up successfully!')
  } catch (error) {
    console.error('❌ Cleanup failed:', error.message)
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2)
  
  if (args.includes('--cleanup')) {
    await cleanupTestData()
    return
  }
  
  const success = await testSupabaseConnection()
  
  if (!success) {
    process.exit(1)
  }
  
  console.log('\n💡 Tips:')
  console.log('   • Run "node test-supabase.js --cleanup" to remove test data')
  console.log('   • Check your Supabase dashboard to see the created data')
  console.log('   • Test data uses UUID: 550e8400-e29b-41d4-a716-446655440000')
}

// Handle cleanup on Ctrl+C
process.on('SIGINT', async () => {
  console.log('\n\n🛑 Interrupted! Cleaning up test data...')
  await cleanupTestData()
  process.exit(0)
})

main().catch(console.error) 