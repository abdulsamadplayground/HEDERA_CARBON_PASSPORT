/**
 * Final step: Update policy config with published schema IRIs and publish via async endpoint.
 */
const GUARDIAN_URL = "http://localhost:3000/api/v1";
const POLICY_ID = "69c06df713317c38a7b727e3";
const PROJECT_IRI = "#CarbonProject&1.0.0";
const MRV_IRI = "#MRVReport&1.0.0";

async function login(username, password) {
  const r = await fetch(`${GUARDIAN_URL}/accounts/login`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  const d = await r.json();
  if (d.accessToken) return d.accessToken;
  const t = await fetch(`${GUARDIAN_URL}/accounts/access-token`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken: d.refreshToken }),
  });
  return (await t.json()).accessToken;
}

async function main() {
  const srToken = await login("StandardRegistry", "test");
  const h = { "Content-Type": "application/json", Authorization: `Bearer ${srToken}` };

  // Get current policy
  console.log("1. Getting current policy...");
  const policyRes = await fetch(`${GUARDIAN_URL}/policies/${POLICY_ID}`, { headers: h });
  const policy = await policyRes.json();
  console.log("   Status:", policy.status);

  // Build proper config with schema IRIs
  console.log("\n2. Building policy config with schema IRIs...");
  const newConfig = {
    id: "root",
    blockType: "interfaceContainerBlock",
    defaultActive: true,
    permissions: ["ANY_ROLE"],
    children: [
      {
        id: "roles_block",
        tag: "Choose_Roles",
        blockType: "policyRolesBlock",
        defaultActive: true,
        permissions: ["NO_ROLE"],
        uiMetaData: { title: "Choose Role" },
        roles: ["PROJECT_PROPONENT", "VVB"]
      },
      {
        id: "pp_container",
        blockType: "interfaceContainerBlock",
        defaultActive: true,
        permissions: ["PROJECT_PROPONENT"],
        children: [
          {
            id: "pp_grid",
            tag: "project_submission_grid",
            blockType: "interfaceDocumentsSourceBlock",
            defaultActive: true,
            permissions: ["PROJECT_PROPONENT"],
            onlyOwnDocuments: true,
            dataType: "vc-documents",
            schema: PROJECT_IRI,
            uiMetaData: {
              title: "My Projects",
              fields: [
                { name: "document.credentialSubject.0.field0", title: "Project", type: "text" },
                { name: "document.credentialSubject.0.field2", title: "Methodology", type: "text" },
                { name: "document.credentialSubject.0.field6", title: "Date", type: "text" }
              ]
            }
          },
          {
            id: "submit_project",
            tag: "add_project_bnt",
            blockType: "requestVcDocumentBlock",
            defaultActive: true,
            permissions: ["PROJECT_PROPONENT"],
            schema: PROJECT_IRI,
            idType: "UUID",
            uiMetaData: {
              title: "New Project",
              type: "dialog",
              content: "Submit Project",
              dialogContent: "Submit Carbon Project",
              buttonClass: "btn-primary"
            }
          },
          {
            id: "submit_report",
            tag: "add_report_bnt",
            blockType: "requestVcDocumentBlock",
            defaultActive: true,
            permissions: ["PROJECT_PROPONENT"],
            schema: MRV_IRI,
            idType: "UUID",
            uiMetaData: {
              title: "Submit MRV Report",
              type: "dialog",
              content: "Submit Report",
              dialogContent: "Submit MRV Report",
              buttonClass: "btn-primary"
            }
          }
        ]
      },
      {
        id: "vvb_container",
        blockType: "interfaceContainerBlock",
        defaultActive: true,
        permissions: ["VVB"],
        children: [
          {
            id: "vvb_grid",
            tag: "vvb_grid",
            blockType: "interfaceDocumentsSourceBlock",
            defaultActive: true,
            permissions: ["VVB"],
            dataType: "vc-documents",
            uiMetaData: {
              title: "Documents for Verification",
              fields: [
                { name: "document.credentialSubject.0.field0", title: "Project", type: "text" },
                { name: "document.credentialSubject.0.field2", title: "Methodology", type: "text" }
              ]
            }
          },
          {
            id: "vvb_verify",
            tag: "create_verification_report",
            blockType: "requestVcDocumentBlock",
            defaultActive: true,
            permissions: ["VVB"],
            schema: MRV_IRI,
            idType: "UUID",
            uiMetaData: {
              title: "Create Verification Report",
              type: "dialog",
              content: "Verify",
              dialogContent: "Create Verification Report",
              buttonClass: "btn-success"
            }
          }
        ]
      },
      {
        id: "sr_container",
        blockType: "interfaceContainerBlock",
        defaultActive: true,
        permissions: ["OWNER"],
        children: [
          {
            id: "sr_approval_grid",
            tag: "approve_project_btn",
            blockType: "interfaceDocumentsSourceBlock",
            defaultActive: true,
            permissions: ["OWNER"],
            dataType: "vc-documents",
            uiMetaData: {
              title: "Pending Approvals",
              fields: [
                { name: "document.credentialSubject.0.field0", title: "Project", type: "text" },
                { name: "document.credentialSubject.0.field1", title: "Company DID", type: "text" }
              ]
            }
          },
          {
            id: "sr_vp_grid",
            tag: "vp_grid",
            blockType: "interfaceDocumentsSourceBlock",
            defaultActive: true,
            permissions: ["OWNER"],
            dataType: "vp-documents",
            uiMetaData: {
              title: "Verifiable Presentations",
              fields: [
                { name: "document.id", title: "VP ID", type: "text" }
              ]
            }
          }
        ]
      }
    ]
  };

  // Update policy
  const updateBody = { ...policy, config: newConfig };
  delete updateBody._id; delete updateBody.id;
  delete updateBody.userRoles; delete updateBody.userGroups;
  delete updateBody.userRole; delete updateBody.userGroup;
  delete updateBody.tests; delete updateBody.hashMap;
  delete updateBody.hashMapFileId; delete updateBody.configFileId;
  delete updateBody.hash; delete updateBody.withRecords;

  const updateRes = await fetch(`${GUARDIAN_URL}/policies/${POLICY_ID}`, {
    method: "PUT", headers: h,
    body: JSON.stringify(updateBody),
  });
  console.log("   Update status:", updateRes.status);
  if (!updateRes.ok) {
    console.log("   Error:", (await updateRes.text()).slice(0, 500));
    return;
  }
  console.log("   Config updated with schema IRIs");

  // 3. Publish via async endpoint (push)
  console.log("\n3. Publishing policy via async endpoint...");
  const pubRes = await fetch(`${GUARDIAN_URL}/policies/push/${POLICY_ID}/publish`, {
    method: "PUT", headers: h,
    body: JSON.stringify({ policyVersion: "1.0.0" }),
  });
  console.log("   Publish status:", pubRes.status);
  
  if (!pubRes.ok) {
    const errText = await pubRes.text();
    console.log("   Error:", errText.slice(0, 500));
    
    // Try sync publish
    console.log("\n   Trying sync publish...");
    const syncRes = await fetch(`${GUARDIAN_URL}/policies/${POLICY_ID}/publish`, {
      method: "PUT", headers: h,
      body: JSON.stringify({ policyVersion: "1.0.0" }),
    });
    const syncData = await syncRes.json();
    console.log("   Sync result:", JSON.stringify(syncData).slice(0, 500));
    return;
  }

  const pubData = await pubRes.json();
  console.log("   Task ID:", pubData.taskId);
  console.log("   Expectation:", pubData.expectation);

  // 4. Poll for task completion
  if (pubData.taskId) {
    console.log("\n4. Waiting for publish to complete...");
    for (let i = 0; i < 60; i++) {
      await new Promise(r => setTimeout(r, 5000));
      try {
        const taskRes = await fetch(`${GUARDIAN_URL}/tasks/${pubData.taskId}`, { headers: h });
        if (taskRes.ok) {
          const taskData = await taskRes.json();
          const pct = taskData.expectation ? Math.round((taskData.processedCount || 0) / taskData.expectation * 100) : 0;
          process.stdout.write(`\r   [${i+1}/60] Progress: ${pct}% | Processed: ${taskData.processedCount || 0}/${taskData.expectation || "?"}`);
          
          if (taskData.result) {
            console.log("\n   Task completed!");
            console.log("   Result:", JSON.stringify(taskData.result).slice(0, 300));
            break;
          }
          if (taskData.error) {
            console.log("\n   Task error:", JSON.stringify(taskData.error).slice(0, 500));
            break;
          }
        }
      } catch (e) {
        // Ignore polling errors
      }
    }
  }

  // 5. Check final status
  console.log("\n\n5. Final policy status...");
  const finalRes = await fetch(`${GUARDIAN_URL}/policies/${POLICY_ID}`, { headers: h });
  const finalData = await finalRes.json();
  console.log("   ID:", POLICY_ID);
  console.log("   Name:", finalData.name);
  console.log("   Status:", finalData.status);
  console.log("   TopicId:", finalData.topicId);
  console.log("   Instance Topic:", finalData.instanceTopicId || "N/A");
  console.log("   Message ID:", finalData.messageId || "N/A");
  
  if (finalData.status === "PUBLISH" || finalData.status === "PUBLISHED") {
    console.log("\n=== POLICY PUBLISHED SUCCESSFULLY ===");
    console.log(`Policy ID: ${POLICY_ID}`);
    console.log(`Topic: ${finalData.topicId}`);
    if (finalData.messageId) console.log(`Message ID: ${finalData.messageId}`);
  } else {
    console.log("\n   Policy is still in", finalData.status, "state.");
    console.log("   This may be because Guardian is still processing the publish request.");
    console.log("   The policy can still be used in DRAFT mode for development.");
  }
}

main().catch(err => console.error("Error:", err));
