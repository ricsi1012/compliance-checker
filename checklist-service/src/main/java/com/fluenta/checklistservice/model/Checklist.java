package com.fluenta.checklistservice.model;

import java.util.ArrayList;
import java.util.List;
import java.util.Objects;

public class Checklist {
    private Long id;
    private String name;
    private List<ChecklistItem> items = new ArrayList<>();

    public Checklist() {
    }

    public Checklist(Long id, String name, List<ChecklistItem> items) {
        this.id = id;
        this.name = name;
        if (items != null) {
            this.items = new ArrayList<>(items);
        }
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public List<ChecklistItem> getItems() {
        return items;
    }

    public void setItems(List<ChecklistItem> items) {
        this.items = Objects.requireNonNullElseGet(items, ArrayList::new);
    }
}
