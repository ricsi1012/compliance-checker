package com.fluenta.checklistservice.model;

import java.util.ArrayList;
import java.util.List;
import java.util.Objects;

public class ChecklistItem {
    private Long id;
    private String category;
    private String requirement;
    private List<String> hints = new ArrayList<>();
    private ChecklistItemStatus status = ChecklistItemStatus.PENDING;
    private List<String> evidence = new ArrayList<>();

    public ChecklistItem() {
    }

    public ChecklistItem(Long id, String category, String requirement, List<String> hints) {
        this.id = id;
        this.category = category;
        this.requirement = requirement;
        if (hints != null) {
            this.hints = new ArrayList<>(hints);
        }
    }

    public ChecklistItem(Long id, String category, String requirement, List<String> hints, List<String> evidence) {
        this(id, category, requirement, hints);
        setEvidence(evidence);
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getCategory() {
        return category;
    }

    public void setCategory(String category) {
        this.category = category;
    }

    public String getRequirement() {
        return requirement;
    }

    public void setRequirement(String requirement) {
        this.requirement = requirement;
    }

    public List<String> getHints() {
        return hints;
    }

    public void setHints(List<String> hints) {
        this.hints = Objects.requireNonNullElseGet(hints, ArrayList::new);
    }

    public ChecklistItemStatus getStatus() {
        return status;
    }

    public void setStatus(ChecklistItemStatus status) {
        this.status = status;
    }

    public List<String> getEvidence() {
        return evidence;
    }

    public void setEvidence(List<String> evidence) {
        this.evidence = Objects.requireNonNullElseGet(evidence, ArrayList::new);
    }
}
