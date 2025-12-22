import { chromium } from "playwright";
import fs from "fs";
import path from "path";
import axios from "axios";

// Use absolute path resolution from process.cwd() to ensure consistency
const SESSION_DIR = path.resolve(process.cwd(), "sessions/pinterest");
const getSessionPath = (userId) => path.join(SESSION_DIR, `${userId}.json`);

export const startLogin = async (userId, credentials) => {
  if (!fs.existsSync(SESSION_DIR)) fs.mkdirSync(SESSION_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: false });
  try {
    const context = await browser.newContext();
    const page = await context.newPage();

    console.log("Opening Pinterest login page...");
    await page.goto("https://www.pinterest.com/login/", { waitUntil: "networkidle" });

    // Wait for email input
    await page.waitForSelector('input[id="email"]', { timeout: 30000 });
    await page.fill('input[id="email"]', credentials.email);

    // Wait for password input
    await page.waitForSelector('input[id="password"]', { timeout: 30000 });
    await page.fill('input[id="password"]', credentials.password);

    // Wait for login button and click
    await page.click('button[type="submit"]');

    // Wait for successful login (Pinterest home or business hub)
    await page.waitForURL(/^https:\/\/www\.pinterest\.com\/?/, { timeout: 0 });

    console.log("Login successful, saving session...");
    //temp code
    // helper function to pause
    const pause = (ms) => new Promise(res => setTimeout(res, ms));

    await pause(3000);
    console.log("⏳ Waiting 3 seconds before navigating...");

    await page.goto("https://www.pinterest.com/pin-builder/", {
      waitUntil: "domcontentloaded", // more reliable than "load"
      timeout: 60000 // 60 seconds
    });
    console.log("➡️ Navigated to Pin Builder, current URL:", page.url());

    await pause(3000);
    console.log("⏳ Waiting 3 seconds for page to settle...");

    await page.waitForSelector('textarea[placeholder="Add your title"]'); // Title input
    console.log("✅ Title input ready");

    const editorSelector = 'div[data-block="true"]';
    await page.waitForSelector(editorSelector); // Description editor
    console.log("✅ Description editor ready");

    await page.waitForSelector('input[aria-label="File upload"]'); // Image upload
    console.log("✅ Image upload input ready");
    await pause(10000);
    await page.fill('textarea[placeholder="Add your title"]', "Product1");
    console.log("🎉 Pin Builder page fully loaded and ready");

    //temp code end
    await context.storageState({ path: getSessionPath(userId) });
    console.log(`Session saved for user ${userId}`);
  } catch (error) {
    console.error("Pinterest login failed:", error);
    throw error;
  } finally {
    await browser.close();
  }
};

export const createPin = async (userId, pinData) => {
  console.log("--------------------------------------------------");
  console.log("createPin called with data:");
  console.log(JSON.stringify(pinData, null, 2));
  console.log("--------------------------------------------------");

  const sessionPath = getSessionPath(userId);

  // Check if session exists
  if (!fs.existsSync(sessionPath)) {
    throw new Error(`Pinterest session not found for user ${userId}. Please connect your Pinterest account first.`);
  }

  const browser = await chromium.launch({ headless: false }); // headless false for debugging
  const context = await browser.newContext({
    storageState: sessionPath // load saved session
  });
  const page = await context.newPage();

  try {
    // First, navigate to Pinterest homepage to verify session is active
    // Use 'load' instead of 'networkidle' to avoid timeout issues
    console.log("Verifying Pinterest session...");
    await page.goto("https://www.pinterest.com/", {
      waitUntil: "load",
      timeout: 60000 // Increase timeout to 60 seconds
    });

    // Wait a bit for any redirects or login checks
    await page.waitForTimeout(3000);

    // Check if we're still on Pinterest (not redirected to login)
    const currentUrl = page.url();
    console.log("Current URL after navigation:", currentUrl);

    if (currentUrl.includes('/login') || currentUrl.includes('/signup')) {
      throw new Error("Pinterest session expired. Please reconnect your Pinterest account.");
    }

    console.log("Session verified, navigating to Pin Builder...");

    // Now navigate to Pinterest Pin Builder with active session
    // Use 'load' instead of 'networkidle' for better reliability
    await page.goto("https://www.pinterest.com/pin-builder/", {
      waitUntil: "load",
      timeout: 60000 // Increase timeout to 60 seconds
    });
    console.log("Opened Pinterest Pin Builder page");

    // Wait for page to load necessary elements
    await page.waitForSelector('textarea[placeholder="Add your title"]'); // Title input
    //class="public-DraftStyleDefault-block public-DraftStyleDefault-ltr"
    const editorSelector = 'div[data-block="true"]';
    await page.waitForSelector(editorSelector);
    console.log("Title filled");
    await page.waitForSelector('input[aria-label="File upload" ]'); // Image upload container

    console.log("Pin Builder page fully loaded");

    // Step 2: Upload Image (only if imagePath is provided)
    if (pinData.imagePath) {
      let uploadPath = pinData.imagePath;
      let tempFilePath = null;

      try {
        // If it's a URL (ImageKit), download it first
        if (pinData.imagePath.startsWith('http')) {
          console.log("Downloading image from URL:", pinData.imagePath);
          const response = await axios({
            url: pinData.imagePath,
            method: 'GET',
            responseType: 'stream'
          });

          const tempFileName = `temp_pin_${Date.now()}.jpg`;
          tempFilePath = path.resolve(process.cwd(), "uploads", tempFileName);

          // Ensure uploads dir exists (just in case)
          if (!fs.existsSync(path.dirname(tempFilePath))) {
            fs.mkdirSync(path.dirname(tempFilePath), { recursive: true });
          }

          const writer = fs.createWriteStream(tempFilePath);
          response.data.pipe(writer);

          await new Promise((resolve, reject) => {
            writer.on('finish', resolve);
            writer.on('error', reject);
          });

          uploadPath = tempFilePath;
          console.log("Image downloaded to temp path:", uploadPath);

          // Verify and resize image if needed
          try {
            const sharp = (await import("sharp")).default;
            const metadata = await sharp(uploadPath).metadata();

            console.log(`Image dimensions: ${metadata.width}x${metadata.height}`);

            if (metadata.width < 1000) {
              console.log(`Image width (${metadata.width}px) is less than 1000px. Resizing to 1000px width...`);

              const resizedFileName = `resized_${path.basename(uploadPath)}`;
              const resizedFilePath = path.join(path.dirname(uploadPath), resizedFileName);

              await sharp(uploadPath)
                .resize({ width: 1000 })
                .toFile(resizedFilePath);

              // Update uploadPath to the resized file
              // We can delete the old temp file if it was a temp file
              if (uploadPath.includes("temp_pin_")) {
                try { fs.unlinkSync(uploadPath); } catch (e) { }
              }
              uploadPath = resizedFilePath;
              // Update tempFilePath so it gets cleaned up later
              tempFilePath = resizedFilePath;

              console.log("Image resized to satisfy minimum dimensions:", uploadPath);
            }
          } catch (sharpError) {
            console.error("Failed to process image with sharp:", sharpError.message);
            // Verify if we should block or continue. Converting warning to error log but continuing best effort.
          }
        }

        // Use setInputFiles directly on the input element - usually hidden but present
        // The input usually has aria-label "File upload" or type="file"
        const uploadInputSelector = 'input[aria-label="File upload"]';

        // Wait for input to be attached (it might be hidden, so don't wait for visibility)
        await page.waitForSelector(uploadInputSelector, { state: 'attached' });

        // Directly set files - this bypasses the system dialog
        await page.setInputFiles(uploadInputSelector, uploadPath);

        console.log("Image uploaded successfully via setInputFiles:", uploadPath);

        // Wait a bit for image to process
        await page.waitForTimeout(3000);
      } catch (error) {
        console.warn("Failed to upload image:", error.message);
      } finally {
        // Cleanup temp file if it exists
        if (tempFilePath && fs.existsSync(tempFilePath)) {
          try {
            fs.unlinkSync(tempFilePath);
            console.log("Temp image deleted:", tempFilePath);
          } catch (e) {
            console.error("Failed to delete temp image:", e);
          }
        }
      }
    } else {
      console.log("No image provided, skipping image upload");
    }

    // Step 3: Fill Title & Description
    await page.fill('textarea[placeholder="Add your title"]', pinData.title);
    if (pinData.description) {
      await page.fill('div[data-block="true"]', pinData.description);
    }
    console.log("Title & description filled");
    // console.log("Pin Builder page fully loaded");
    // Step 4: Select Board
    // Step 4: Select Board
    const boardDropdownSelectors = [
      'div[data-test-id="board-dropdown-placeholder"]',
      'div[data-test-id="board-dropdown-select-button"]',
      '[aria-label="Select a board"]',
      '[data-test-id="board-selection-button"]',
      'div[role="button"]:has-text("Choose a board")'
    ];

    let dropdownClicked = false;
    for (const selector of boardDropdownSelectors) {
      try {
        if (await page.isVisible(selector, { timeout: 2000 })) {
          await page.click(selector);
          console.log(`Board dropdown opened using selector: ${selector}`);
          dropdownClicked = true;
          break;
        }
      } catch (e) {
        // Ignore timeout for individual checks
      }
    }

    if (!dropdownClicked) {
      console.log("Could not find board dropdown with standard selectors. Attempting to force wait for the default...");
      // Fallback to original with explicit wait
      await page.waitForSelector('div[data-test-id="board-dropdown-placeholder"]');
      await page.click('div[data-test-id="board-dropdown-placeholder"]');
    }
    console.log("Board dropdown opened");
    await page.waitForTimeout(1000); // wait for boards to load
    //role="listitem"
    // Scrape all board names
    const boards = await page.$$eval('div[title]', (elements) =>
      elements
        .map(el => el.getAttribute('title'))
        .filter(t => t && t !== "Create board")
    );
    console.log(`Found ${boards.length} existing boards:`, boards);

    let targetBoard = pinData.board;
    let clickCreate = true;

    // Match logic: Exact -> AI Semantic -> Fuzzy Fallback
    if (boards.length > 0) {
      // 1. Try exact match (case-insensitive) locally first
      const exactMatch = boards.find(b => b.toLowerCase() === targetBoard.toLowerCase());
      if (exactMatch) {
        targetBoard = exactMatch;
        clickCreate = false;
        console.log(`Found exact match locally: "${targetBoard}"`);
      } else {
        // 2. usage of AI for semantic matching
        try {
          // Dynamic import to avoid circular dependency issues if any
          const { findBestMatchingBoard } = await import("./ai.service.js");
          console.log(`Asking AI to find best match for "${targetBoard}" among boards...`);

          const aiMatch = await findBestMatchingBoard(targetBoard, boards);

          if (aiMatch) {
            targetBoard = aiMatch;
            clickCreate = false;
            console.log(`AI found semantic match: "${targetBoard}"`);
          } else {
            console.log("AI did not find a suitable match. Proceeding to create new or fuzzy check...");
          }
        } catch (err) {
          console.warn("AI matching failed, falling back to string similarity...", err.message);
        }

        // 3. Fallback: Fuzzy string matching removed as requested. Only AI or Exact match.
        // If AI fails/returns null, we proceed to create the board.
      }
    }

    if (clickCreate) {
      console.log(`Creating new board: ${targetBoard}`);
      // Click "Create board"
      await page.click(`div[title="Create board"]`);

      // Wait for the input to appear. 
      // User persists in using a div or non-input selector. 
      // To be safe and avoid "element is not an <input>" errors, we will click and TYPE.
      try {
        await page.waitForSelector('input[aria-invalid="false"]', { timeout: 2000 });
        await page.fill('input[aria-invalid="false"]', targetBoard);
        page.click('button[type="submit"]');
        await page.waitForTimeout(1000);
        page.click('div[data-test-id="board-dropdown-save-button"]');
        await page.waitForTimeout(10000);
      } catch (e) {
        // Fallback to expecting an input id if the div name doesn't exist
        try {
          await page.waitForSelector('input[id="boardName"]', { timeout: 1000 });
          await page.click('input[id="boardName"]');
        } catch (err) {
          // Just type blindly if selectors fail, hoping focus is there
        }
      }

      await page.keyboard.type(targetBoard);

      await page.click('button[data-test-id="board-form-submit-button"]');
      // Wait for board creation to complete
      await page.waitForTimeout(3000);
    } else {
      console.log(`Selecting existing board: ${targetBoard}`);
      // Search for the board in the dropdown filter
      await page.keyboard.type(targetBoard);
      await page.waitForTimeout(1500); // wait for filter to process

      // Click the specific board item (assuming it appears first or we find it by title)
      // The 'title' attribute might be on the list item
      try {
        await page.click(`div[title="${targetBoard}"]`);
      } catch (e) {
        console.log("Could not click by title, trying first result from filter...");
        await page.keyboard.press('Enter');
      }
    }

    // Step 5: Publish Pin
    // await page.click('button[data-test-id="pin-draft-save-button"], button:has-text("Publish")');
    // console.log("Pin published successfully");

  } catch (error) {
    console.error("Error creating pin:", error);
    throw error; // Re-throw to let the controller handle it
  } finally {
    await browser.close();
  }
};
