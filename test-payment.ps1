$headers = @{
  'x-publishable-api-key' = 'pk_04d1573087be32a5c0bdbf1a2cd94209288923148bf94f60470f18b4c272e84e'
  'Content-Type' = 'application/json'
}

$cartId = 'cart_01KWHKK6TWQ4B5CRDJ0D3RNF19'

Write-Host '--- Create payment collection ---'
try {
  $body = @{ cart_id = $cartId } | ConvertTo-Json
  $raw = Invoke-WebRequest -Uri 'https://jumua.co.tz/store/payment-collections' -Method POST -Headers $headers -Body $body -TimeoutSec 20
  Write-Host $raw.Content
} catch {
  Write-Host "ERROR: $($_.Exception.Message)"
  Write-Host $_.ErrorDetails.Message
}

Write-Host "`n--- Initiate payment session ---"
try {
  $body = @{ provider_id = 'pp_system_default' } | ConvertTo-Json
  # First get or create collection
  $pc = Invoke-RestMethod -Uri 'https://jumua.co.tz/store/payment-collections' -Method POST -Headers $headers -Body (@{ cart_id = $cartId } | ConvertTo-Json) -TimeoutSec 20
  $pcId = $pc.payment_collection.id
  Write-Host "Collection ID: $pcId"
  $session = Invoke-RestMethod -Uri "https://jumua.co.tz/store/payment-collections/$pcId/payment-sessions" -Method POST -Headers $headers -Body $body -TimeoutSec 20
  $session | ConvertTo-Json -Depth 5
} catch {
  Write-Host "ERROR: $($_.Exception.Message)"
  Write-Host $_.ErrorDetails.Message
}
