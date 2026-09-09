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

  // 1. Upload as myrachana-erp-v1.0.2.apk (Visible versioned file in Supabase dashboard)
  const { error: versionError } = await supabase.storage
    .from('apk-releases')
    .upload('myrachana-erp-v1.0.2.apk', fileBuffer, {
      contentType: 'application/vnd.android.package-archive',
      upsert: true,
    })

  if (versionError) {
    console.error('Failed to upload myrachana-erp-v1.0.2.apk:', versionError.message)
  } else {
    console.log('✅ Uploaded: myrachana-erp-v1.0.2.apk')
  }

  // 2. Upload / overwrite as myrachana-erp.apk (Permanent latest download link)
  const { error: latestError } = await supabase.storage
    .from('apk-releases')
    .upload('myrachana-erp.apk', fileBuffer, {
      contentType: 'application/vnd.android.package-archive',
      upsert: true,
    })

  if (latestError) {
    console.error('Failed to upload latest myrachana-erp.apk:', latestError.message)
  } else {
    console.log('✅ Uploaded: myrachana-erp.apk (Latest)')
  }

  const { data: vData } = supabase.storage
    .from('apk-releases')
    .getPublicUrl('myrachana-erp-v1.0.2.apk')

  const { data: publicData } = supabase.storage
    .from('apk-releases')
    .getPublicUrl('myrachana-erp.apk')

  console.log('\n🎉 Both releases are live in Supabase Storage!')
  console.log('Version 1.0.2 URL:', vData.publicUrl)
  console.log('Latest URL:', publicData.publicUrl)
}

main().catch(console.error)
