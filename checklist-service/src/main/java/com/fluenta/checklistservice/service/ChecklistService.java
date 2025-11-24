package com.fluenta.checklistservice.service;

import com.fluenta.checklistservice.dto.ChecklistProgressResponse;
import com.fluenta.checklistservice.model.Checklist;
import com.fluenta.checklistservice.model.ChecklistItem;
import com.fluenta.checklistservice.model.ChecklistItemStatus;
import jakarta.annotation.PostConstruct;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class ChecklistService {

    private static final Map<Long, Checklist> CHECKLIST_STORE = new ConcurrentHashMap<>();

    @PostConstruct
    public void loadSampleData() {
        if (!CHECKLIST_STORE.isEmpty()) {
            return;
        }

        Checklist iso27001 = new Checklist(1L, "ISO 27001 Essential Controls", new ArrayList<>());
        iso27001.setItems(buildIso27001Items());

        CHECKLIST_STORE.put(iso27001.getId(), iso27001);
    }

    public List<Checklist> getAllChecklists() {
        return CHECKLIST_STORE.values().stream()
                .sorted(Comparator.comparing(Checklist::getId))
                .map(this::cloneChecklist)
                .toList();
    }

    public Checklist getChecklist(Long id) {
        Checklist checklist = CHECKLIST_STORE.get(id);
        if (checklist == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Checklist not found");
        }
        return cloneChecklist(checklist);
    }

    public ChecklistItem updateItemStatus(Long checklistId, Long itemId, ChecklistItemStatus status, List<String> evidence) {
        Checklist checklist = CHECKLIST_STORE.get(checklistId);
        if (checklist == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Checklist not found");
        }

        ChecklistItem targetItem = checklist.getItems().stream()
                .filter(item -> item.getId().equals(itemId))
                .findFirst()
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Checklist item not found"));

        targetItem.setStatus(status);
        if (evidence != null) {
            targetItem.setEvidence(evidence);
        }
        return cloneChecklistItem(targetItem);
    }

    public ChecklistProgressResponse getProgress(Long checklistId) {
        Checklist checklist = CHECKLIST_STORE.get(checklistId);
        if (checklist == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Checklist not found");
        }

        long total = checklist.getItems().size();
        long passed = checklist.getItems().stream()
                .filter(item -> item.getStatus() == ChecklistItemStatus.PASSED)
                .count();
        double percentage = total == 0 ? 0 : (passed * 100.0) / total;
        return new ChecklistProgressResponse(checklist.getId(), checklist.getName(), total, passed, percentage);
    }

    private List<ChecklistItem> buildIso27001Items() {
        List<ChecklistItem> items = new ArrayList<>();

        items.add(new ChecklistItem(101L, "Access Control", "Password policy exists",
            List.of("Link to current password standard", "Evidence of executive approval")));
        items.add(new ChecklistItem(102L, "Access Control", "User access reviews quarterly",
            List.of("Q1-Q4 review tracker", "Manager attestations")));
        items.add(new ChecklistItem(103L, "Access Control", "Admin access logged",
            List.of("SIEM search export", "Sample privileged session")));

        items.add(new ChecklistItem(201L, "Incident Management", "Incident response plan documented",
            List.of("Latest IR plan PDF", "Approval meeting notes")));
        items.add(new ChecklistItem(202L, "Incident Management", "Incident log maintained",
            List.of("Incident register", "Ticket references")));
        items.add(new ChecklistItem(203L, "Incident Management", "Recovery procedures tested",
            List.of("Test schedule", "Post-test report")));

        items.add(new ChecklistItem(301L, "Data Protection", "Backup policy defined",
            List.of("Backup policy doc", "Version history")));
        items.add(new ChecklistItem(302L, "Data Protection", "Encryption standards documented",
            List.of("Crypto standard", "KMS evidence")));
        items.add(new ChecklistItem(303L, "Data Protection", "Data retention policy exists",
            List.of("Retention matrix", "Automation evidence")));

        return items;
    }

    private Checklist cloneChecklist(Checklist original) {
        Checklist copy = new Checklist();
        copy.setId(original.getId());
        copy.setName(original.getName());
        List<ChecklistItem> clonedItems = original.getItems().stream()
                .map(this::cloneChecklistItem)
                .toList();
        copy.setItems(clonedItems);
        return copy;
    }

    private ChecklistItem cloneChecklistItem(ChecklistItem item) {
        ChecklistItem clone = new ChecklistItem();
        clone.setId(item.getId());
        clone.setCategory(item.getCategory());
        clone.setRequirement(item.getRequirement());
        clone.setHints(new ArrayList<>(item.getHints()));
        clone.setStatus(item.getStatus());
        clone.setEvidence(new ArrayList<>(item.getEvidence()));
        return clone;
    }
}
