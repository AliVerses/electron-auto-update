# Electron Auto-Update Example

This repo contains a complete example of an auto-updating Electron app using [`electron-updater`](https://github.com/electron-userland/electron-builder/tree/master/packages/electron-updater) with releases published to **AWS S3** and served via **AWS CloudFront**.

![Application Screenshot](https://i.imgur.com/examplescreenshot.jpg)

## Features

- Multi-channel update support (stable, beta, dev channels)
- Real-time update progress tracking
- Automatic update checks on startup
- Manual update checking via UI
- AWS S3 + CloudFront distribution for efficient delivery
- Complete code signing and notarization process for macOS
- Cross-platform support (macOS, Windows, Linux)

## Provider Options

If you can't use AWS, you can use other providers:

- [Complete electron-updater HTTP example](https://gist.github.com/iffy/0ff845e8e3f59dbe7eaf2bf24443f104)
- [Complete electron-updater from gitlab.com private repo example](https://gist.github.com/Slauta/5b2bcf9fa1f6f6a9443aa6b447bcae05)

**NOTE:** This guide assumes you have basic familiarity with AWS S3 and CloudFront. You will need an AWS account.

## Setup & Deployment Guide

### 1. Code Signing (macOS)

For macOS, you will need a code-signing certificate.

Install Xcode (from the App Store), then follow [these instructions](https://developer.apple.com/library/content/documentation/IDEs/Conceptual/AppDistributionGuide/MaintainingCertificates/MaintainingCertificates.html#//aupple_ref/doc/uid/TP40012582-CH31-SW6) to make sure you have a "Developer ID Application" certificate. If you'd like to export the certificate (for automated building, for instance) [you can](https://developer.apple.com/library/content/documentation/IDEs/Conceptual/AppDistributionGuide/MaintainingCertificates/MaintainingCertificates.html#//apple_ref/doc/uid/TP40012582-CH31-SW7). You would then follow [these instructions](https://www.electron.build/code-signing).
   
This example application is set up to perform code-signing and notarization on macOS provided that a `Developer ID Application` certificate is installed in the default keychain. The following environment variables are important for the signing process:

- `CSC_IDENTITY_AUTO_DISCOVERY` - controls whether `electron-builder` tries to sign the application; default is `true`, set to `false` to skip signing
- `APPLE_ID` - the Apple ID to use for notarization (required for signing).
- `APPLE_ID_PASSWORD` - the password to use with the specified Apple ID for notarization (required for signing). Apple recommends setting up an app-specific password to safeguard the Apple ID password (see [Apple Support](https://support.apple.com/en-us/HT204397)) for more information.

To enable code-signing and notarization:

```sh
export CSC_IDENTITY_AUTO_DISCOVERY="true"
export APPLE_ID="<your Apple ID>"
export APPLE_ID_PASSWORD="<your Apple Password>"
```

### 2. Configure Package.json

Configure the [`publish`](https://www.electron.build/configuration/publish#s3options) property in your `package.json` or `electron-builder.yml` to use the `s3` provider. You'll need to specify your bucket name and optionally a region, path (prefix), and access control list (ACL).

```json
{
    "build": {
        "publish": {
            "provider": "s3",
            "bucket": "your-electron-updates-bucket", 
            "region": "us-east-1", 
            "path": "${channel}/", 
            "acl": "private",
            "endpoint": "https://your-cloudfront-distribution.cloudfront.net"
        }
    }
}
```

### 3. AWS S3 & CloudFront Setup

#### 3.1 S3 Bucket

Create an S3 bucket for your update artifacts:

1. Go to the AWS S3 console and create a new bucket (e.g., `your-electron-updates-bucket`)
2. Set up the bucket policy if needed (private is recommended when using CloudFront)
3. Configure CORS to allow your Electron app to access update metadata files:

```xml
<CORSConfiguration>
  <CORSRule>
    <AllowedOrigin>app://-</AllowedOrigin>
    <AllowedMethod>GET</AllowedMethod>
    <AllowedHeader>*</AllowedHeader>
  </CORSRule>
</CORSConfiguration>
```

#### 3.2 CloudFront Distribution

1. Create a CloudFront distribution with your S3 bucket as the origin
2. Set up Origin Access Identity (OAI) or Origin Access Control (OAC) to secure your S3 bucket
3. Configure cache behaviors:
   - Set short TTLs for `*.yml` files (e.g., 60 seconds) to ensure update metadata is fresh
   - Set longer TTLs for installation packages (e.g., 1 week or more)
4. Make sure to forward necessary headers for CORS
5. Note your CloudFront domain (e.g., `https://d1234abcdef.cloudfront.net`)

### 4. AWS Credentials Configuration

This example uses the `env-cmd` package to manage environment-specific configurations. Configure your AWS credentials in `.env-cmdrc.json`:

```json
{
  "dev": {
    "AWS_ACCESS_KEY_ID": "YOUR_ACCESS_KEY_ID",
    "AWS_SECRET_ACCESS_KEY": "YOUR_SECRET_ACCESS_KEY",
    "UPDATE_CHANNEL": "dev"
  },
  "beta": {
    "AWS_ACCESS_KEY_ID": "YOUR_ACCESS_KEY_ID",
    "AWS_SECRET_ACCESS_KEY": "YOUR_SECRET_ACCESS_KEY",
    "UPDATE_CHANNEL": "beta"
  },
  "stable": {
    "AWS_ACCESS_KEY_ID": "YOUR_ACCESS_KEY_ID",
    "AWS_SECRET_ACCESS_KEY": "YOUR_SECRET_ACCESS_KEY",
    "UPDATE_CHANNEL": "stable"
  }
}
```

Your AWS credentials need these permissions for the S3 bucket:
- `s3:PutObject`
- `s3:PutObjectAcl` (if using ACLs)
- `s3:ListBucket`

### 5. Install Dependencies and Build

Install necessary dependencies:

```sh
npm install
```

### 6. Initial Publishing

For the first build (version 0.1.0):

```sh
# Build without auto-publishing
npm run pack
```

Install the generated app package (from the `dist` folder) on your machine.

### 7. Publish Updates

1. Update the version in `package.json` (e.g., from 0.1.0 to 0.1.1)
2. Publish with your selected channel:

```sh
# To publish to stable channel
npm run publish

# To publish to beta channel
env-cmd -e beta electron-builder --publish always

# To publish to dev channel
env-cmd -e dev electron-builder --publish always
```

## Implementation Details

### Update Channel Management

This app supports multiple update channels:

- **stable**: Production-ready releases
- **beta**: Pre-release testing versions
- **dev**: Development and experimental builds

The update channel determines which S3 path is used when checking for updates. Users can switch between channels in the app UI.

### Automatic Update Process

1. App initializes and checks for updates after a 3-second delay
2. When updates are available, they're downloaded automatically
3. Progress is shown in the UI during download
4. User is notified when the update is ready to install
5. User clicks "Install Update" to quit and install

## Troubleshooting

- If updates aren't downloading, verify your AWS credentials and S3 bucket permissions
- Check CloudFront distribution settings, especially CORS configuration
- Ensure proper entitlements are set for macOS applications
- Review electron-builder logs for detailed error information

## License

This project is released under the Unlicense. See the LICENSE file for details.
 