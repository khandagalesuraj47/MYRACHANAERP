import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const apkPath = path.resolve(__dirname, '../myrachana-erp.apk')

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://gmhvckxqfarpkfpvuspj.supabase.co'
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_I-Bx4F5oJ3fLoUqhaty28w_sk7L6YCi'

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

async function main() {
  if (!fs.existsSync(apkPath)) {
    console.error('APK file not found at:', apkPath)
    process.exit(1)
  }

  const fileBuffer = fs.readFileSync(apkPath)
  console.log(`Uploading ${apkPath} (${(fileBuffer.length / 1024 / 1024).toFixed(2)} MB) to Supabase Storage...`)

  const { error } = await supabase.storage
    .from('apk-releases')
    .upload('myrachana-erp.apk', fileBuffer, {
      contentType: 'application/vnd.android.package-archive',
      upsert: true,
    })

  if (error) {
    console.error('Failed to upload APK to Supabase Storage:', error.message)
    console.log('\nNote: Run the SQL in supabase/migrations/20260909000005_storage_apk_bucket.sql in Supabase SQL editor first to provision the bucket.')
    process.exit(1)
  }

  const { data: publicData } = supabase.storage
    .from('apk-releases')
    .getPublicUrl('myrachana-erp.apk')

  console.log('\n✅ APK successfully uploaded to Supabase Storage!')
  console.log('Public Download URL:', publicData.publicUrl)
}

main().catch(console.error)
